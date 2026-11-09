// TC-034 → TC-045: nhà quảng cáo tạo chiến dịch, Admin duyệt, chống gian lận, báo cáo.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  seedBase, call, one, rows, countOf, balance, login, routeExists, addView, addUser, addUserWithLedger,
  dayOffset, injectFault, as,
} from './helpers.mjs';

const validAd = (o = {}) => ({
  advertiser_id: 2, category_id: 1, title: 'Chiến dịch mới', video_url: 'https://www.youtube.com/watch?v=abc123xyz00',
  duration_sec: 30, reward_xu: 10, budget_xu: 5000, start_date: dayOffset(1), end_date: dayOffset(30),
  target_gender: 'FEMALE', target_age_from: 18, target_age_to: 24, target_province: 'Hà Nội', ...o,
});
const createAd = o => call('ads', 'POST', { body: validAd(o) });
const setStatus = (id, body) => call('ads/[id]/status', 'PATCH', { params: { id }, body });
const fraud = body => call('admin/fraud', 'POST', { body, headers: as(1) });
const adStatus = id => one('SELECT status AS s FROM ads WHERE ad_id = ?', id).s;
const tierReward = d => (d <= 15 ? 5 : d <= 30 ? 10 : 20);

describe('Nhà quảng cáo tạo chiến dịch (TC-034…036)', () => {
  beforeEach(() => seedBase());

  it('TC-034 | tạo chiến dịch hợp lệ: trạng thái PENDING và có cấu hình đối tượng mục tiêu', async () => {
    const r = await createAd();
    assert.equal(r.status, 200, r.raw);
    const ad = one('SELECT * FROM ads WHERE ad_id = ?', r.body.ad_id);
    assert.equal(ad.status, 'PENDING');
    assert.equal(ad.spent_xu, 0);
    assert.equal(ad.duration_sec, 30);
    assert.equal(ad.budget_xu, 5000);
    const t = rows('SELECT * FROM ad_targeting WHERE ad_id = ?', ad.ad_id);
    assert.equal(t.length, 1);
    assert.deepEqual({ g: t[0].gender, f: t[0].age_from, to: t[0].age_to, p: t[0].province }, { g: 'FEMALE', f: 18, to: 24, p: 'Hà Nội' });
  });

  it('TC-035 | thời lượng ngoài 5–60 giây bị từ chối (90 giây, biên 4 và 61); biên 5 và 60 được chấp nhận', async () => {
    const problems = [];
    for (const d of [90, 4, 61, 0, -5]) {
      const r = await createAd({ duration_sec: d });
      if (r.status !== 400) problems.push(`thời lượng ${d}s phải bị từ chối 400, nhận ${r.status}`);
    }
    for (const d of [5, 60]) {
      const r = await createAd({ duration_sec: d, reward_xu: tierReward(d) });
      if (r.status !== 200) problems.push(`thời lượng ${d}s (biên hợp lệ) bị từ chối, nhận ${r.status}`);
    }
    assert.deepEqual(problems, []);
    assert.equal(countOf('ads', 'duration_sec IN (90, 61, 4)'), 0);
  });

  it('TC-036 | ngày kết thúc trước ngày bắt đầu: báo lỗi, chặn lưu; cùng ngày thì hợp lệ', async () => {
    const bad = await createAd({ start_date: dayOffset(10), end_date: dayOffset(5), title: 'Sai ngày' });
    assert.equal(bad.status, 400, bad.raw);
    assert.equal(countOf('ads', 'title = ?', 'Sai ngày'), 0);
    const same = await createAd({ start_date: dayOffset(5), end_date: dayOffset(5) });
    assert.equal(same.status, 200, same.raw);
  });

  it('EXT-32 | dữ liệu chiến dịch sai kiểu/thiếu bị từ chối 4xx (không để lọt xuống CSDL gây lỗi 500)', async () => {
    const cases = {
      'thời lượng không phải số': { duration_sec: 'abc' },
      'ngân sách không phải số': { budget_xu: 'abc' },
      'thiếu ngày bắt đầu': { start_date: undefined },
      'thiếu ngày kết thúc': { end_date: undefined },
      'danh mục không tồn tại': { category_id: 999 },
      'video_url không phải link YouTube': { video_url: 'javascript:alert(1)' },
    };
    const problems = [];
    for (const [label, o] of Object.entries(cases)) {
      const r = await createAd(o);
      if (!(r.status >= 400 && r.status < 500)) problems.push(`${label} -> HTTP ${r.status}`);
    }
    assert.deepEqual(problems, [], 'API-01 yêu cầu kiểm tra dữ liệu đầu vào:\n  ' + problems.join('\n  '));
  });

  it('EXT-33 | xu thưởng mỗi lượt xem không được vượt khung quy định theo thời lượng (5/10/20)', async () => {
    const r = await createAd({ reward_xu: 1_000_000, budget_xu: 2_000_000 });
    const ad = r.status === 200 ? one('SELECT reward_xu FROM ads WHERE ad_id = ?', r.body.ad_id) : null;
    assert.ok(!ad || ad.reward_xu <= tierReward(30),
      `Nhà quảng cáo tự đặt thưởng ${ad?.reward_xu} xu/lượt (khung quy định cho 30 giây là ${tierReward(30)} xu): có thể "in" xu hàng loạt`);
  });

  it('EXT-34 | gửi duyệt phải giữ chỗ ngân sách khỏi ví nhà quảng cáo (SYS-02 UC-04)', async () => {
    const before = balance(2);
    const r = await createAd({ budget_xu: 5000 });
    assert.equal(r.status, 200, r.raw);
    assert.equal(balance(2), before - 5000, 'Ngân sách chiến dịch không bị trừ/giữ chỗ khi gửi duyệt');
  });
});

describe('Admin duyệt quảng cáo (TC-037, TC-038)', () => {
  beforeEach(() => seedBase());

  it('TC-037 | Admin duyệt: PENDING → ACTIVE, lưu reviewed_by, quảng cáo hiển thị cho người xem', async () => {
    const r = await setStatus(4, { status: 'ACTIVE', reviewed_by: 1 });
    assert.equal(r.status, 200, r.raw);
    const ad = one('SELECT * FROM ads WHERE ad_id = 4');
    assert.equal(ad.status, 'ACTIVE');
    assert.equal(ad.reviewed_by, 1);
    const list = await call('ads', 'GET', { query: { role: 'VIEWER', userId: 9 } });
    assert.ok(list.body.ads.some(a => a.ad_id === 4));
  });

  it('TC-038 | Admin từ chối kèm lý do: REJECTED, lưu lý do, không hiển thị cho người xem', async () => {
    const r = await setStatus(4, { status: 'REJECTED', reject_reason: 'Nội dung vi phạm', reviewed_by: 1 });
    assert.equal(r.status, 200, r.raw);
    const ad = one('SELECT * FROM ads WHERE ad_id = 4');
    assert.equal(ad.status, 'REJECTED');
    assert.equal(ad.reject_reason, 'Nội dung vi phạm');
    const list = await call('ads', 'GET', { query: { role: 'VIEWER', userId: 9 } });
    assert.ok(!list.body.ads.some(a => a.ad_id === 4));
  });

  it('TC-038 | từ chối thì hoàn ngân sách đã giữ về ví nhà quảng cáo', async () => {
    const before = balance(2);
    const c = await createAd({ budget_xu: 5000 });
    assert.equal(balance(2), before - 5000, 'Không có ngân sách giữ chỗ khi gửi duyệt nên không có gì để hoàn (xem EXT-34)');
    await setStatus(c.body.ad_id, { status: 'REJECTED', reject_reason: 'Vi phạm', reviewed_by: 1 });
    assert.equal(balance(2), before, 'Từ chối nhưng không hoàn ngân sách');
  });

  it('EXT-35 | chuyển trạng thái không hợp lệ bị từ chối 409 và không đổi trạng thái (REJECTED/ENDED → ACTIVE, PENDING → PAUSED)', async () => {
    const attempts = [[6, 'ACTIVE'], [5, 'ACTIVE'], [4, 'PAUSED']];
    const problems = [];
    for (const [id, to] of attempts) {
      const from = adStatus(id);
      const r = await setStatus(id, { status: to, reviewed_by: 1 });
      if (adStatus(id) !== from) problems.push(`QC #${id}: ${from} → ${to} được chấp nhận (HTTP ${r.status})`);
      else if (r.status !== 409) problems.push(`QC #${id}: ${from} → ${to} trả ${r.status} thay vì 409`);
    }
    assert.deepEqual(problems, [], 'API-01: 409 khi trạng thái không hợp lệ:\n  ' + problems.join('\n  '));
  });

  it('EXT-36 | cập nhật trạng thái quảng cáo không tồn tại trả 404', async () => {
    const r = await setStatus(99999, { status: 'ACTIVE', reviewed_by: 1 });
    assert.equal(r.status, 404, `trả ${r.status} ${r.body?.message ?? ''}`);
  });

  it('EXT-37 | trạng thái không hợp lệ (chuỗi lạ) bị từ chối 400', async () => {
    const r = await setStatus(4, { status: 'HACKED', reviewed_by: 1 });
    assert.equal(r.status, 400);
    assert.equal(adStatus(4), 'PENDING');
  });

  it('EXT-38 | từ chối quảng cáo phải có lý do (API-01, UI-01)', async () => {
    const r = await setStatus(4, { status: 'REJECTED', reviewed_by: 1 });
    assert.equal(r.status, 400, 'Từ chối không kèm lý do vẫn được chấp nhận');
  });
});

describe('Phân quyền (TC-039, TC-040)', () => {
  beforeEach(() => seedBase());

  it('TC-039 | Viewer gọi API danh sách quảng cáo của Admin: bị từ chối 403', async () => {
    const r = await call('ads', 'GET', { query: { role: 'ADMIN', status: 'PENDING' }, headers: as(5) });
    assert.equal(r.status, 403,
      `Viewer (user 5) nhận HTTP ${r.status} và ${r.body?.ads?.length ?? 0} quảng cáo: role do client tự khai trên query string (?role=ADMIN)`);
  });

  it('TC-040 | có endpoint báo cáo hiệu quả chiến dịch /ads/{id}/report', () => {
    assert.ok(routeExists('ads/[id]/report'), 'Chưa có endpoint báo cáo chiến dịch (UC-AV05) nên không thể kiểm tra quyền xem báo cáo');
  });

  it('TC-040 | Nhà QC A không xem được chiến dịch của Nhà QC B (403)', async () => {
    const r = await call('ads', 'GET', { query: { role: 'ADVERTISER', userId: 3 }, headers: as(2) });
    assert.equal(r.status, 403, `Nhà QC #2 đọc được ${r.body?.ads?.length ?? 0} chiến dịch của Nhà QC #3 (HTTP ${r.status})`);
  });
});

describe('Chống gian lận (TC-041…044)', () => {
  beforeEach(() => seedBase());

  it('TC-041 | cảnh báo nhiều tài khoản cùng thiết bị: đủ 4 tài khoản, không báo nhầm người khác', async () => {
    const sharers = [1, 2, 3, 4].map(() => addUser());
    sharers.forEach((u, i) => addView({ user_id: u, ad_id: 1, device_id: 'DEV-SHARED-01', reward_xu: 10 }));
    const honest = addUser();
    addView({ user_id: honest, ad_id: 1, device_id: 'DEV-OWN-99', reward_xu: 10 });
    const r = await call('admin/fraud', 'GET', { headers: as(1) });
    assert.equal(r.status, 200, r.raw);
    const list = r.body.alerts ?? r.body.suspicious_users ?? [];
    const flagged = new Set(list.map(x => x.user_id));
    for (const u of sharers) assert.ok(flagged.has(u), `thiếu tài khoản ${u} trong cảnh báo`);
    const viewers = rows("SELECT user_id FROM users WHERE system_role = 'VIEWER'").map(x => x.user_id).filter(id => !sharers.includes(id));
    const falsePos = viewers.filter(id => flagged.has(id));
    assert.deepEqual(falsePos, [], `${falsePos.length}/${viewers.length} người xem KHÔNG dùng chung thiết bị cũng bị liệt kê: danh sách "nghi vấn" đang trả TẤT CẢ người xem, không có tiêu chí device_id`);
  });

  it('TC-042 | Admin vô hiệu & thu hồi 500 xu: trừ bằng ADJUST, số dư không âm', async () => {
    const u = addUserWithLedger(500);
    const r = await fraud({ action: 'REVOKE_XU', target_user_id: u, revoke_amount: 500, reason: 'Tua video' });
    assert.equal(r.status, 200, r.raw);
    assert.equal(balance(u), 0);
    const adj = rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'ADJUST' ORDER BY txn_id DESC", u)[0];
    assert.equal(adj.amount, -500);
    assert.equal(adj.balance_after, 0);
  });

  it('TC-042 | Admin vô hiệu: các lượt xem nghi vấn chuyển sang INVALID', async () => {
    const u = addUserWithLedger(500);
    addView({ user_id: u, ad_id: 1, reward_xu: 250 });
    addView({ user_id: u, ad_id: 2, reward_xu: 250 });
    await fraud({ action: 'REVOKE_XU', target_user_id: u, revoke_amount: 500, reason: 'Tua video' });
    const st = [...new Set(rows('SELECT view_status AS s FROM ad_views WHERE user_id = ?', u).map(x => x.s))];
    assert.deepEqual(st, ['INVALID'], `Các lượt xem vẫn ${st.join('/')}: REVOKE_XU chỉ trừ xu, không vô hiệu lượt xem (API-01 có hành động "invalidate")`);
  });

  it('TC-043 | thu hồi khi số dư không đủ (200 < 500): số dư về 0, không âm', async () => {
    const u = addUserWithLedger(200);
    const r = await fraud({ action: 'REVOKE_XU', target_user_id: u, revoke_amount: 500, reason: 'Gian lận' });
    assert.equal(r.status, 200, r.raw);
    assert.equal(balance(u), 0);
    const adj = rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'ADJUST' ORDER BY txn_id DESC", u)[0];
    assert.equal(adj.amount, -200, 'chỉ trừ phần có thật');
  });

  it('TC-043 | thu hồi thiếu: phần thiếu (300 xu) được ghi vào ghi chú', async () => {
    const u = addUserWithLedger(200);
    await fraud({ action: 'REVOKE_XU', target_user_id: u, revoke_amount: 500, reason: 'Gian lận' });
    const adj = rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'ADJUST' ORDER BY txn_id DESC", u)[0];
    assert.match(adj.note, /300/, `Ghi chú "${adj.note}" không nêu phần thiếu 300 xu`);
  });

  it('TC-044 | khóa tài khoản: trạng thái LOCKED', async () => {
    const r = await fraud({ action: 'TOGGLE_LOCK', target_user_id: 5 });
    assert.equal(r.status, 200, r.raw);
    assert.equal(one('SELECT account_status AS s FROM users WHERE user_id = 5').s, 'LOCKED');
  });

  it('TC-044 | tài khoản đã khóa không đăng nhập được', async () => {
    await fraud({ action: 'TOGGLE_LOCK', target_user_id: 5 });
    const r = await login('long.tv@gmail.com', '123456');
    assert.notEqual(r.body.success, true, 'Tài khoản vừa bị khóa vẫn đăng nhập thành công (success=true)');
  });

  it('EXT-39 | bấm "Khóa" hai lần liên tiếp (double-click) vẫn giữ trạng thái LOCKED', async () => {
    await fraud({ action: 'TOGGLE_LOCK', target_user_id: 5 });
    await fraud({ action: 'TOGGLE_LOCK', target_user_id: 5 });
    assert.equal(one('SELECT account_status AS s FROM users WHERE user_id = 5').s, 'LOCKED',
      'TOGGLE_LOCK đảo trạng thái: gửi lặp sẽ vô tình mở khóa tài khoản gian lận');
  });

  it('EXT-40 | hành động Admin với đối tượng/tham số sai: 404 hoặc 400, không đổi dữ liệu', async () => {
    assert.equal((await fraud({ action: 'TOGGLE_LOCK', target_user_id: 99999 })).status, 404);
    assert.equal((await fraud({ action: 'REVOKE_XU', target_user_id: 99999, revoke_amount: 10 })).status, 404);
    assert.equal((await fraud({ action: 'XOA_HET', target_user_id: 5 })).status, 400);
    const before = balance(5);
    assert.equal((await fraud({ action: 'REVOKE_XU', target_user_id: 5, revoke_amount: -50 })).status, 400);
    assert.equal(balance(5), before);
  });

  it('EXT-41 | CSDL lỗi khi thu hồi xu: rollback, số dư nguyên vẹn', async () => {
    const before = balance(8);
    injectFault(/INSERT INTO xu_transactions/i);
    const r = await fraud({ action: 'REVOKE_XU', target_user_id: 8, revoke_amount: 100, reason: 'x' });
    assert.equal(r.status, 500);
    assert.equal(balance(8), before);
  });
});

describe('Báo cáo quản trị (TC-045)', () => {
  beforeEach(() => seedBase());

  it('TC-045 | xuất báo cáo Excel xu phát hành / đã đổi / chi phí QC (cần endpoint /admin/reports/export)', () => {
    assert.ok(routeExists('admin/reports/export'), 'Chưa có endpoint xuất báo cáo Excel (UC-AD06)');
  });

  it('EXT-42 | thống kê tổng quan khớp dữ liệu thực', async () => {
    const r = await call('admin/stats', 'GET', { headers: as(1) });
    assert.equal(r.status, 200, r.raw);
    const s = r.body.stats;
    assert.equal(s.users.total_users, countOf('users'));
    assert.equal(s.users.total_viewers, countOf('users', "system_role = 'VIEWER'"));
    assert.equal(s.users.total_locked, countOf('users', "account_status = 'LOCKED'"));
    assert.equal(s.ads.total_ads, countOf('ads'));
    assert.equal(s.ads.active_ads, countOf('ads', "status = 'ACTIVE'"));
    assert.equal(s.ads.pending_ads, countOf('ads', "status = 'PENDING'"));
  });
});
