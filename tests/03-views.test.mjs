// TC-012 → TC-024: xem quảng cáo, nhận xu, chống gian lận, hạn mức, ngân sách.
// Thời gian "đã xem" được giả lập bằng backdate(): lùi started_at của lượt xem, không cần chờ thật.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, seedBase, one, rows, countOf, balance, start, complete, backdate, watchFully, addAd, addView,
  dayOffset, TODAY, routeExists, db,
} from './helpers.mjs';

const spent = id => one('SELECT spent_xu AS s FROM ads WHERE ad_id = ?', id).s;
const viewStatus = token => one('SELECT view_status AS s FROM ad_views WHERE view_token = ?', token)?.s;
const body = (user_id, ad_id, view_token, watched_seconds) => ({ user_id, ad_id, view_token, watched_seconds });

let adSeq = 1000;
/** Tạo n lượt xem đã hoàn tất hôm nay của user trên n quảng cáo mới, mỗi lượt thưởng `reward` xu. */
function seedCompletedToday(user_id, n, reward) {
  for (let i = 0; i < n; i++) {
    const ad_id = ++adSeq;
    addAd({ ad_id, reward_xu: reward, budget_xu: 1_000_000 });
    addView({ user_id, ad_id, reward_xu: reward });
  }
}

describe('Xem quảng cáo – luồng chính', () => {
  beforeEach(() => seedBase());

  it('TC-012 | xem đủ thời lượng: cộng xu, sinh dòng EARN, tăng spent_xu', async () => {
    const bal0 = balance(9), spent0 = spent(1);
    const { start: s, complete: c, token } = await watchFully(9, 1);
    assert.equal(s.status, 200, s.raw);
    assert.equal(s.body.duration_sec, 30);
    assert.equal(s.body.reward_xu, 10);
    assert.match(s.body.view_token, /^tok_/);
    assert.equal(c.status, 200, c.raw);
    assert.equal(balance(9), bal0 + 10);
    const earn = rows("SELECT * FROM xu_transactions WHERE user_id = 9 AND txn_type = 'EARN'");
    assert.equal(earn.length, 1, 'phải sinh đúng 1 dòng EARN');
    assert.equal(earn[0].amount, 10);
    assert.equal(earn[0].balance_after, bal0 + 10);
    assert.equal(spent(1), spent0 + 10);
    assert.equal(viewStatus(token), 'COMPLETED');
  });

  it('TC-013 | tua video (complete ngay sau start dù khai đủ thời lượng): không cộng xu, lượt chuyển INVALID', async () => {
    const bal0 = balance(9);
    const s = await start(9, 1);
    backdate(s.body.view_token, 2);                                        // thực tế mới trôi qua 2 giây
    await complete(body(9, 1, s.body.view_token, 30));                     // nhưng client khai đã xem 30 giây
    assert.equal(balance(9), bal0,
      `Server cộng ${balance(9) - bal0} xu dù mới trôi qua 2/30 giây: server tin số giây do client khai (watched_seconds), không tự đo`);
    assert.equal(viewStatus(s.body.view_token), 'INVALID');
  });

  it('TC-014 | chuyển tab giữa chừng: thời gian ngoài tab không được tính (kiểm tra mã nguồn giao diện)', () => {
    const src = fs.readFileSync(join(ROOT, 'app', 'page.js'), 'utf8');
    assert.match(src, /visibilitychange|document\.hidden|visibilityState/,
      'page.js đếm ngược bằng setInterval và không xử lý chuyển tab/ẩn trang; server cũng không đo giờ nên không có lớp nào chặn');
  });

  it('TC-015 | complete với token giả: không cộng xu', async () => {
    const bal0 = balance(9);
    const r = await complete(body(9, 1, 'tok_khong_ton_tai', 30));
    assert.equal(r.body.success, false);
    assert.equal(balance(9), bal0);
    assert.equal(countOf('xu_transactions', 'user_id = 9'), 0);
  });

  it('TC-015 | complete với token giả trả 409 (theo TC-01)', async () => {
    const r = await complete(body(9, 1, 'tok_khong_ton_tai', 30));
    assert.equal(r.status, 409, `trả ${r.status}`);
  });

  it('TC-016 | gọi complete sau 5 giây với QC 30 giây (khai thật 5s): không cộng xu, lượt INVALID', async () => {
    const bal0 = balance(9);
    const s = await start(9, 1);
    backdate(s.body.view_token, 5);
    const r = await complete(body(9, 1, s.body.view_token, 5));
    assert.equal(r.body.success, false);
    assert.equal(balance(9), bal0);
    assert.equal(viewStatus(s.body.view_token), 'INVALID');
  });

  it('TC-016 | gọi complete sau 5 giây dù khai đủ 30s: bị từ chối 409 NOT_WATCHED_ENOUGH', async () => {
    const bal0 = balance(9);
    const s = await start(9, 1);
    backdate(s.body.view_token, 5);
    const r = await complete(body(9, 1, s.body.view_token, 30));
    assert.equal(balance(9), bal0, `Đã cộng ${balance(9) - bal0} xu dù mới xem 5/30 giây`);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, 'NOT_WATCHED_ENOUGH');
  });

  it('TC-016 | mã lỗi khi chưa xem đủ là 409 + NOT_WATCHED_ENOUGH (API-01), kể cả khi client khai thật', async () => {
    const s = await start(9, 1);
    backdate(s.body.view_token, 5);
    const r = await complete(body(9, 1, s.body.view_token, 5));
    assert.equal(r.status, 409, `trả ${r.status}`);
    assert.equal(r.body.error, 'NOT_WATCHED_ENOUGH', `thiếu mã lỗi ổn định; message="${r.body.message}"`);
  });

  it('TC-017 | dùng lại view_token đã hoàn tất: từ chối, không cộng thêm xu', async () => {
    const { token } = await watchFully(9, 1);
    const bal1 = balance(9);
    const again = await complete(body(9, 1, token, 30));
    assert.equal(again.body.success, false);
    assert.equal(balance(9), bal1);
    assert.equal(countOf('xu_transactions', "user_id = 9 AND txn_type = 'EARN'"), 1);
  });

  it('TC-017 | gửi hai yêu cầu complete cùng lúc cho một token: chỉ cộng xu một lần', async () => {
    const s = await start(9, 1);
    backdate(s.body.view_token, 31);
    const [a, b] = await Promise.all([
      complete(body(9, 1, s.body.view_token, 30)),
      complete(body(9, 1, s.body.view_token, 30)),
    ]);
    assert.equal([a, b].filter(r => r.status === 200).length, 1, 'phải đúng 1 yêu cầu thành công');
    assert.equal(balance(9), 10);
    assert.equal(countOf('xu_transactions', "user_id = 9 AND txn_type = 'EARN'"), 1);
    assert.equal(spent(1), 10, 'spent_xu bị cộng hai lần');
  });

  it('TC-018 | xem lại cùng quảng cáo trong ngày: bị từ chối, báo đã xem hôm nay', async () => {
    await watchFully(9, 1);
    const before = countOf('ad_views', 'user_id = 9');
    const r = await start(9, 1);
    assert.equal(r.body.success, false);
    assert.match(r.body.message, /hôm nay/);
    assert.equal(r.body.view_token, undefined, 'không được cấp token mới');
    assert.equal(countOf('ad_views', 'user_id = 9'), before);
  });

  it('TC-018 | xem lại cùng quảng cáo trong ngày trả 409 (theo TC-01)', async () => {
    await watchFully(9, 1);
    const r = await start(9, 1);
    assert.equal(r.status, 409, `trả ${r.status}`);
  });
});

describe('Xem quảng cáo – hạn mức ngày và khoảng nghỉ', () => {
  beforeEach(() => seedBase());

  it('TC-019 | đạt trần 50 lượt/ngày: từ chối bắt đầu xem tiếp, báo đạt giới hạn', async () => {
    seedCompletedToday(9, 50, 1);
    const r = await start(9, 1);
    assert.notEqual(r.status, 200, 'vẫn cho xem lượt thứ 51 trong ngày');
    assert.equal(r.body.success, false);
    assert.match(r.body.message, /giới hạn|50 lượt/i);
  });

  it('TC-019 | đạt trần 50 lượt/ngày trả 429 (theo TC-01)', async () => {
    seedCompletedToday(9, 50, 1);
    const r = await start(9, 1);
    assert.equal(r.status, 429, `trả ${r.status}`);
  });

  it('EXT-20 | biên 49 lượt: vẫn được xem lượt thứ 50 trong ngày', async () => {
    seedCompletedToday(9, 49, 1);
    const r = await start(9, 1);
    assert.equal(r.status, 200, r.raw);
  });

  it('TC-020 | đạt trần 500 xu/ngày: từ chối kèm thông báo trần xu', async () => {
    seedCompletedToday(9, 10, 50);                                         // 10 lượt × 50 = 500 xu
    const r = await start(9, 1);
    assert.notEqual(r.status, 200, 'vẫn cho xem tiếp dù đã nhận đủ 500 xu');
    assert.match(r.body.message, /500 xu/);
  });

  it('TC-021 | khoảng nghỉ 10 giây: vừa xem xong, bấm xem QC khác sau vài giây bị từ chối', async () => {
    await watchFully(9, 1);
    const r = await start(9, 2);                                           // gần như ngay lập tức
    assert.notEqual(r.status, 200, 'Cho bắt đầu lượt mới ngay sau khi vừa hoàn tất; SYS-02 yêu cầu nghỉ tối thiểu 10 giây');
  });

  it('EXT-11 | không thể vượt trần 50 lượt bằng cách bắt đầu nhiều lượt rồi hoàn tất cùng lúc', async () => {
    seedCompletedToday(9, 48, 1);
    addAd({ ad_id: 50 });
    const tokens = [];
    for (const ad of [1, 2, 3, 50]) {
      const s = await start(9, ad);                                        // 48 < 50 nên cả 4 lần start đều qua
      if (s.status === 200) tokens.push({ ad, t: s.body.view_token, d: s.body.duration_sec });
    }
    for (const { ad, t, d } of tokens) { backdate(t, d + 1); await complete(body(9, ad, t, d)); }
    const done = countOf('ad_views', "user_id = 9 AND view_status = 'COMPLETED' AND view_date = ?", TODAY());
    assert.ok(done <= 50, `${done} lượt hoàn tất trong một ngày (trần 50): complete không kiểm tra lại hạn mức, start chỉ đếm lượt đã COMPLETED`);
  });
});

describe('Xem quảng cáo – mất kết nối và ngân sách', () => {
  beforeEach(() => seedBase());

  it('TC-022 | mất kết nối >30s: server phải nhận heartbeat để đánh INVALID (cần endpoint /views/heartbeat)', () => {
    assert.ok(routeExists('views/heartbeat'), 'Chưa có /views/heartbeat nên server không thể biết người xem đã rời đi');
  });

  it('TC-022 | sau khi lượt bị INVALID người xem được xem lại quảng cáo đó', async () => {
    const s1 = await start(9, 1);
    db.prepare("UPDATE ad_views SET view_status = 'INVALID' WHERE view_token = ?").run(s1.body.view_token);
    const s2 = await start(9, 1);
    assert.equal(s2.status, 200, s2.raw);
    assert.notEqual(s2.body.view_token, s1.body.view_token);
    assert.equal(viewStatus(s2.body.view_token), 'STARTED');
  });

  it('TC-023 | hết hẳn ngân sách khi bắt đầu: báo quảng cáo đã hết lượt', async () => {
    addAd({ ad_id: 40, budget_xu: 100, spent_xu: 100, reward_xu: 10 });
    const r = await start(9, 40);
    assert.notEqual(r.status, 200);
    assert.match(r.body.message, /hết (lượt|ngân sách)/i);
  });

  it('TC-023 | ngân sách còn ít hơn xu thưởng (còn 5, thưởng 10): phải từ chối vì hoàn tất sẽ vượt ngân sách', async () => {
    addAd({ ad_id: 41, budget_xu: 100, spent_xu: 95, reward_xu: 10 });
    const r = await start(9, 41);
    assert.notEqual(r.status, 200, 'Cho bắt đầu xem dù ngân sách còn 5 xu < xu thưởng 10 xu');
    assert.match(r.body.message ?? '', /hết (lượt|ngân sách)/i);
  });

  it('EXT-10 | biên ngân sách: còn đúng bằng xu thưởng thì vẫn được xem', async () => {
    addAd({ ad_id: 42, budget_xu: 100, spent_xu: 90, reward_xu: 10 });
    const r = await start(9, 42);
    assert.equal(r.status, 200, r.raw);
  });

  it('TC-024 | hai người cùng bắt đầu xem lượt ngân sách cuối: chỉ một người được giữ chỗ', async () => {
    addAd({ ad_id: 43, budget_xu: 100, spent_xu: 90, reward_xu: 10 });     // chỉ còn đủ 1 lượt
    const [a, b] = await Promise.all([start(5, 43), start(6, 43)]);
    const ok = [a, b].filter(r => r.status === 200).length;
    assert.equal(ok, 1, `${ok}/2 người được bắt đầu xem: start không giữ chỗ ngân sách (spent_xu chỉ tăng khi complete)`);
  });

  it('TC-024 | cả hai xem hết thì không ai bị lỗi và spent_xu không vượt budget_xu', async () => {
    addAd({ ad_id: 43, budget_xu: 100, spent_xu: 90, reward_xu: 10 });
    const [a, b] = await Promise.all([start(5, 43), start(6, 43)]);
    const results = [];
    for (const [uid, s] of [[5, a], [6, b]]) {
      if (s.status !== 200) continue;
      backdate(s.body.view_token, 31);
      results.push({ uid, c: await complete(body(uid, 43, s.body.view_token, 30)) });
    }
    const failed = results.filter(x => x.c.status !== 200).map(x => `user ${x.uid} -> HTTP ${x.c.status}`);
    assert.deepEqual(failed, [], 'Người xem hết video nhưng bị lỗi khi nhận xu (ngân sách không được giữ chỗ từ đầu)');
    assert.ok(spent(43) <= 100, `spent_xu=${spent(43)} vượt budget_xu=100`);
  });
});

describe('Xem quảng cáo – điều kiện bắt đầu và quyền sở hữu lượt xem', () => {
  beforeEach(() => seedBase());

  it('EXT-12 | không thể bắt đầu xem quảng cáo không ACTIVE hoặc không tồn tại', async () => {
    const accepted = [];
    for (const ad of [4, 5, 6, 7, 999]) {       // PENDING, ENDED, REJECTED, PAUSED, không có
      const r = await start(9, ad);
      if (r.status === 200) accepted.push(ad);
    }
    assert.deepEqual(accepted, []);
  });

  it('EXT-13 | không thể bắt đầu xem quảng cáo ngoài khoảng ngày chạy (đã hết hạn / chưa tới ngày)', async () => {
    addAd({ ad_id: 60, start_date: dayOffset(-30), end_date: dayOffset(-1) });
    addAd({ ad_id: 61, start_date: dayOffset(3), end_date: dayOffset(20) });
    const accepted = [];
    for (const ad of [60, 61]) if ((await start(9, ad)).status === 200) accepted.push(ad);
    assert.deepEqual(accepted, [], 'start chỉ kiểm tra status/ngân sách, không kiểm tra start_date/end_date (danh sách thì có)');
  });

  it('EXT-14 | tài khoản bị khóa không bắt đầu xem được (403)', async () => {
    const r = await start(10, 1);
    assert.equal(r.status, 403);
  });

  it('EXT-15 | tài khoản bị khóa giữa chừng thì không hoàn tất nhận xu được', async () => {
    const s = await start(9, 1);
    backdate(s.body.view_token, 31);
    db.prepare("UPDATE users SET account_status = 'LOCKED' WHERE user_id = 9").run();   // admin khóa khi đang xem
    await complete(body(9, 1, s.body.view_token, 30));
    assert.equal(balance(9), 0, 'Tài khoản đã bị khóa vẫn nhận được xu: complete không kiểm tra account_status');
  });

  it('EXT-16 | token quá cũ (2 giờ) không còn hoàn tất được', async () => {
    const s = await start(9, 1);
    backdate(s.body.view_token, 7200);
    await complete(body(9, 1, s.body.view_token, 30));
    assert.equal(balance(9), 0, 'Token tồn tại vô thời hạn: không có hạn dùng cho view_token');
  });

  it('EXT-17 | thiếu tham số bị từ chối 400', async () => {
    assert.equal((await start(9, undefined)).status, 400);
    assert.equal((await complete({ user_id: 9, ad_id: 1 })).status, 400);
  });

  it('SEC-10 | không thể hoàn tất lượt xem bằng token của người khác để nhận xu về mình', async () => {
    const s = await start(5, 1);                    // user 5 đang xem
    backdate(s.body.view_token, 31);
    const bal9 = balance(9);
    await complete(body(9, 1, s.body.view_token, 30));   // user 9 dùng token của user 5
    assert.equal(balance(9), bal9, `User 9 nhận ${balance(9) - bal9} xu bằng token của user 5: complete không kiểm tra view thuộc về ai`);
  });

  it('SEC-11 | không thể tăng thưởng bằng cách khai ad_id khác với quảng cáo đã bắt đầu xem', async () => {
    const spent3 = spent(3);
    const s = await start(9, 2);                    // QC #2: 15 giây, thưởng 5 xu
    backdate(s.body.view_token, 16);
    await complete(body(9, 3, s.body.view_token, 45));   // khai là QC #3: 45 giây, thưởng 20 xu
    assert.ok(balance(9) <= 5, `Nhận ${balance(9)} xu thay vì tối đa 5 xu: complete tin ad_id do client gửi`);
    assert.equal(spent(3), spent3, 'trừ nhầm ngân sách của quảng cáo #3');
  });

  it('SEC-12 | lượt đã bị đánh INVALID thì không thể "hồi sinh" bằng một yêu cầu complete khác', async () => {
    const s = await start(9, 1);
    await complete(body(9, 1, s.body.view_token, 3));    // khai thật 3 giây -> INVALID
    assert.equal(viewStatus(s.body.view_token), 'INVALID');
    await complete(body(9, 1, s.body.view_token, 30));   // gửi lại, lần này khai đủ
    assert.equal(balance(9), 0, 'Token INVALID vẫn nhận được xu: complete chỉ chặn trạng thái COMPLETED');
  });

  it('EXT-18 | các thao tác xem quảng cáo không để lại transaction bị treo', async () => {
    const { stats } = await import('./helpers.mjs');
    await watchFully(9, 1);
    await complete(body(9, 1, 'tok_sai', 30));
    await complete({});
    assert.equal(stats.leaked, 0);
  });
});
