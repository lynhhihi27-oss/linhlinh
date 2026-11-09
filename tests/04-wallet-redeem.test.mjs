// TC-025 → TC-033: ví xu, đổi quà, duyệt/từ chối đơn. Kèm kiểm thử song song và rollback (TEST-01 §Bổ sung).
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  seedBase, call, one, rows, countOf, balance, redeem, watchFully, start, complete, backdate,
  addUserWithLedger, addReward, injectFault, stats, ledgerViolations, routeExists,
} from './helpers.mjs';

const stock = id => one('SELECT stock_qty AS s FROM rewards WHERE reward_id = ?', id).s;
const orderOf = id => one('SELECT * FROM redemptions WHERE redemption_id = ?', id);
const processOrder = (id, body) => call('redemptions/[id]/process', 'PATCH', { params: { id }, body });
const newOrder = async (user, reward) => {
  const r = await redeem(user, reward);
  assert.equal(r.status, 200, r.raw);
  return one('SELECT redemption_id AS id FROM redemptions WHERE user_id = ? ORDER BY redemption_id DESC', user).id;
};

describe('Ví xu (TC-025, TC-026)', () => {
  beforeEach(() => seedBase());

  it('TC-025 | lịch sử giao dịch khớp số dư: mỗi dòng có loại, số xu, số dư sau; dòng mới nhất khớp số dư ví', async () => {
    const u = addUserWithLedger(1000);
    await watchFully(u, 1);                       // +10
    await watchFully(u, 2);                       // +5
    const r = await redeem(u, 1);                 // -1000
    assert.equal(r.status, 200, r.raw);
    const w = await call('wallet', 'GET', { query: { userId: u } });
    assert.equal(w.status, 200);
    const tx = w.body.transactions;
    assert.equal(tx.length, 4, 'ADJUST đầu kỳ + 2 EARN + 1 REDEEM');
    for (const t of tx) {
      assert.ok(t.txn_type, 'thiếu loại giao dịch');
      assert.equal(typeof t.amount, 'number');
      assert.equal(typeof t.balance_after, 'number');
    }
    assert.equal(w.body.balance, balance(u));
    assert.equal(tx[0].balance_after, w.body.balance, 'dòng mới nhất phải có số dư sau giao dịch = số dư ví');
    assert.deepEqual(ledgerViolations(u), []);
  });

  it('TC-026 | số dư không âm: trừ 200 xu khi chỉ có 100 xu bị từ chối, số dư vẫn 100', async () => {
    const u = addUserWithLedger(100);
    const rw = addReward({ xu_cost: 200, stock_qty: 5 });
    const r = await redeem(u, rw);
    assert.equal(r.body.success, false);
    assert.equal(balance(u), 100);
    assert.equal(stock(rw), 5);
    assert.equal(countOf('redemptions', 'user_id = ?', u), 0);
    assert.equal(countOf('xu_transactions', "user_id = ? AND txn_type = 'REDEEM'", u), 0);
  });

  it('EXT-21 | ví của người dùng không tồn tại trả 404', async () => {
    assert.equal((await call('wallet', 'GET', { query: { userId: 99999 } })).status, 404);
  });
});

describe('Đổi quà (TC-027…032)', () => {
  beforeEach(() => seedBase());

  it('TC-027 | đổi quà ≤ 50.000đ: trừ xu, tự duyệt, trả mã thẻ, sinh dòng REDEEM', async () => {
    const u = addUserWithLedger(1500);
    const stock0 = stock(1);
    const r = await redeem(u, 1);                 // thẻ 10.000đ = 1.000 xu
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.status, 'APPROVED');
    assert.match(r.body.gift_code, /^(CARD|VOUCHER)-/);
    assert.equal(balance(u), 500);
    assert.equal(r.body.balance_after, 500);
    const t = rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'REDEEM'", u);
    assert.equal(t.length, 1);
    assert.equal(t[0].amount, -1000);
    assert.equal(t[0].balance_after, 500);
    assert.equal(stock(1), stock0 - 1);
    const o = one('SELECT * FROM redemptions WHERE user_id = ?', u);
    assert.equal(o.status, 'APPROVED');
    assert.equal(o.xu_spent, 1000);
    assert.ok(o.gift_code);
    assert.deepEqual(ledgerViolations(u), []);
  });

  it('TC-028 | không đủ xu: báo thiếu 500 xu, không trừ xu, không tạo đơn', async () => {
    const u = addUserWithLedger(500);
    const r = await redeem(u, 1);
    assert.equal(r.body.success, false);
    assert.ok(r.status >= 400 && r.status < 500, `phải 4xx, nhận ${r.status}`);
    assert.match(r.body.message, /thiếu\s+500/);
    assert.equal(balance(u), 500);
    assert.equal(countOf('redemptions', 'user_id = ?', u), 0);
  });

  it('TC-029 | hết hàng: không đổi được, không trừ xu; danh mục vẫn trả stock_qty = 0 để giao diện khóa nút', async () => {
    const u = addUserWithLedger(5000);
    const r = await redeem(u, 5);                 // quà #5 có stock_qty = 0
    assert.equal(r.body.success, false);
    assert.equal(balance(u), 5000);
    const list = await call('rewards', 'GET');
    const item = list.body.rewards.find(x => x.reward_id === 5);
    assert.ok(item, 'danh mục phải vẫn liệt kê quà hết hàng để hiển thị "Tạm hết"');
    assert.equal(item.stock_qty, 0);
    assert.ok(!list.body.rewards.some(x => x.reward_id === 6), 'quà đã đóng (is_active=0) không được hiển thị');
  });

  it('TC-030 | OTP sai 3 lần khi đổi quà bị khóa 15 phút (cần endpoint xác nhận OTP)', () => {
    assert.ok(routeExists('redemptions/confirm'),
      'Chưa có /redemptions/confirm: đổi quà trừ xu ngay, không có bước xác nhận OTP (UC-V04)');
  });

  it('TC-031 | tối đa 3 đơn/ngày: đơn thứ 4 bị từ chối 429', async () => {
    const u = addUserWithLedger(10000);
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await redeem(u, 1)).status);
    assert.deepEqual(codes.slice(0, 3), [200, 200, 200]);
    assert.notEqual(codes[3], 200, `Đơn thứ 4 trong ngày vẫn được chấp nhận (${countOf('redemptions', 'user_id = ?', u)} đơn): chưa giới hạn số đơn/ngày`);
    assert.equal(codes[3], 429);
  });

  it('TC-032 | đơn > 50.000đ chờ duyệt: PENDING, chưa có mã thẻ, xu đã trừ', async () => {
    const u = addUserWithLedger(20000);
    const r = await redeem(u, 4);                 // voucher 100.000đ = 10.000 xu
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.status, 'PENDING');
    assert.equal(r.body.gift_code, null);
    assert.equal(balance(u), 10000);
    const o = one('SELECT * FROM redemptions WHERE user_id = ?', u);
    assert.equal(o.status, 'PENDING');
    assert.equal(o.gift_code, null);
    assert.equal(countOf('xu_transactions', "user_id = ? AND txn_type = 'REDEEM'", u), 1);
  });

  it('EXT-22 | biên 50.000đ: đúng 50.000đ tự duyệt, 50.001đ chờ Admin duyệt', async () => {
    const u = addUserWithLedger(50000);
    const edge = addReward({ face_value_vnd: 50001, xu_cost: 5001, stock_qty: 5 });
    const a = await redeem(u, 3);                 // 50.000đ
    const b = await redeem(u, edge);              // 50.001đ
    assert.equal(a.body.status, 'APPROVED');
    assert.equal(b.body.status, 'PENDING');
  });

  it('EXT-23 | yêu cầu đổi quà không hợp lệ: thiếu tham số 400, quà không tồn tại/đã đóng 404, tài khoản khóa 403', async () => {
    const u = addUserWithLedger(5000);
    assert.equal((await redeem(undefined, 1)).status, 400);
    assert.equal((await redeem(u, undefined)).status, 400);
    assert.equal((await redeem(u, 999)).status, 404);
    assert.equal((await redeem(u, 6)).status, 404);
    assert.equal((await redeem(10, 1)).status, 403);
  });
});

describe('Duyệt / từ chối đơn đổi quà (TC-033)', () => {
  beforeEach(() => seedBase());

  it('TC-033 | Admin từ chối đơn: hoàn xu bằng REFUND, trả hàng về kho, đơn REJECTED', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    const stockAfterOrder = stock(4);
    const p = await processOrder(id, { action: 'REJECT', admin_id: 1, reason: 'Hết mã thẻ' });
    assert.equal(p.status, 200, p.raw);
    assert.equal(balance(u), 20000, 'phải hoàn đủ xu');
    const refund = rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'REFUND'", u);
    assert.equal(refund.length, 1, 'phải sinh đúng 1 dòng REFUND');
    assert.equal(refund[0].amount, 10000);
    assert.equal(refund[0].balance_after, 20000);
    assert.equal(stock(4), stockAfterOrder + 1, 'phải trả hàng về kho');
    assert.equal(orderOf(id).status, 'REJECTED');
    assert.equal(orderOf(id).gift_code, null);
    assert.deepEqual(ledgerViolations(u), []);
  });

  it('TC-033 | lý do từ chối được lưu và người xem nhìn thấy được', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    await processOrder(id, { action: 'REJECT', admin_id: 1, reason: 'Hết mã thẻ lô này' });
    const list = await call('redemptions', 'GET', { query: { userId: u } });
    const order = list.body.redemptions.find(o => o.redemption_id === id);
    const wallet = await call('wallet', 'GET', { query: { userId: u } });
    const seen = JSON.stringify(order) + JSON.stringify(wallet.body.transactions);
    assert.match(seen, /Hết mã thẻ lô này/,
      'Lý do Admin nhập không được lưu (bảng redemptions không có cột lý do, route bỏ qua trường reason) nên người xem không được thông báo vì sao bị từ chối');
  });

  it('TC-033 | Admin duyệt đơn lớn: cấp mã thẻ, giữ nguyên xu đã trừ, không hoàn xu', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    const p = await processOrder(id, { action: 'APPROVE', admin_id: 1 });
    assert.equal(p.status, 200, p.raw);
    assert.match(p.body.gift_code, /^(CARD|VOUCHER)-/);
    assert.equal(orderOf(id).status, 'APPROVED');
    assert.equal(orderOf(id).processed_by, 1);
    assert.equal(balance(u), 10000);
    assert.equal(countOf('xu_transactions', "user_id = ? AND txn_type = 'REFUND'", u), 0);
  });

  it('EXT-24 | đơn đã xử lý không xử lý lại được: không hoàn xu hai lần, không đổi từ REJECTED sang APPROVED', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    await processOrder(id, { action: 'REJECT', admin_id: 1 });
    const again = await processOrder(id, { action: 'REJECT', admin_id: 1 });
    const flip = await processOrder(id, { action: 'APPROVE', admin_id: 1 });
    assert.ok(again.status >= 400 && flip.status >= 400);
    assert.equal(balance(u), 20000, 'bị hoàn xu hai lần');
    assert.equal(orderOf(id).status, 'REJECTED');
    assert.equal(orderOf(id).gift_code, null);
  });

  it('EXT-25 | hai Admin duyệt và từ chối cùng một đơn cùng lúc: chỉ một thao tác có hiệu lực', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    const [a, b] = await Promise.all([
      processOrder(id, { action: 'APPROVE', admin_id: 1 }),
      processOrder(id, { action: 'REJECT', admin_id: 1 }),
    ]);
    assert.equal([a, b].filter(r => r.status === 200).length, 1);
    const o = orderOf(id);
    const refunds = countOf('xu_transactions', "user_id = ? AND txn_type = 'REFUND'", u);
    if (o.status === 'REJECTED') { assert.equal(refunds, 1); assert.equal(o.gift_code, null); assert.equal(balance(u), 20000); }
    else { assert.equal(o.status, 'APPROVED'); assert.equal(refunds, 0); assert.ok(o.gift_code); assert.equal(balance(u), 10000); }
  });

  it('EXT-26 | hành động không hợp lệ và đơn không tồn tại', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    assert.equal((await processOrder(id, { action: 'XOA', admin_id: 1 })).status, 400);
    assert.equal(orderOf(id).status, 'PENDING');
    assert.equal((await processOrder(99999, { action: 'APPROVE', admin_id: 1 })).status, 404);
  });

  it('CT-07 | đơn đã được xử lý trả 409 (API-01)', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    await processOrder(id, { action: 'REJECT', admin_id: 1 });
    const again = await processOrder(id, { action: 'REJECT', admin_id: 1 });
    assert.equal(again.status, 409, `trả ${again.status}`);
  });

  it('CT-08 | thiếu xu / hết hàng trả 409 (API-01)', async () => {
    const poor = addUserWithLedger(10);
    const rich = addUserWithLedger(5000);
    const lacking = await redeem(poor, 1);
    const soldOut = await redeem(rich, 5);
    assert.equal(lacking.status, 409, `thiếu xu trả ${lacking.status}`);
    assert.equal(soldOut.status, 409, `hết hàng trả ${soldOut.status}`);
  });
});

describe('Song song và rollback (TEST-01 §Bổ sung)', () => {
  beforeEach(() => seedBase());

  it('EXT-27 | hai yêu cầu đổi cùng một mã quà cuối cùng: chỉ một người được đổi', async () => {
    const rw = addReward({ xu_cost: 1000, stock_qty: 1 });
    const a = addUserWithLedger(5000), b = addUserWithLedger(5000);
    const [ra, rb] = await Promise.all([redeem(a, rw), redeem(b, rw)]);
    assert.equal([ra, rb].filter(r => r.status === 200).length, 1);
    assert.equal(stock(rw), 0);
    assert.equal(countOf('redemptions', 'reward_id = ?', rw), 1);
    assert.equal(balance(a) + balance(b), 9000, 'chỉ một người bị trừ xu');
  });

  it('EXT-28 | bấm đổi quà hai lần cùng lúc khi chỉ đủ xu cho một lần: số dư không âm, chỉ một đơn', async () => {
    const u = addUserWithLedger(1000);
    const [r1, r2] = await Promise.all([redeem(u, 1), redeem(u, 1)]);
    assert.equal([r1, r2].filter(r => r.status === 200).length, 1);
    assert.equal(balance(u), 0);
    assert.equal(countOf('redemptions', 'user_id = ?', u), 1);
    assert.equal(countOf('xu_transactions', "user_id = ? AND txn_type = 'REDEEM'", u), 1);
    assert.deepEqual(ledgerViolations(u), []);
  });

  it('EXT-29 | CSDL lỗi giữa chừng khi đổi quà: rollback hoàn toàn (xu, kho, đơn đều nguyên vẹn)', async () => {
    const u = addUserWithLedger(2000);
    const stock0 = stock(1);
    injectFault(/INSERT INTO xu_transactions/i);
    const r = await redeem(u, 1);
    assert.equal(r.status, 500);
    assert.equal(balance(u), 2000, 'xu đã bị trừ dù giao dịch lỗi');
    assert.equal(stock(1), stock0, 'kho đã bị giảm dù giao dịch lỗi');
    assert.equal(countOf('redemptions', 'user_id = ?', u), 0);
    assert.equal(stats.leaked, 0);
  });

  it('EXT-30 | CSDL lỗi giữa chừng khi hoàn tất xem quảng cáo: lượt vẫn STARTED, không cộng xu, không tăng spent_xu', async () => {
    const s = await start(9, 1);
    backdate(s.body.view_token, 31);
    injectFault(/INSERT INTO xu_transactions/i);
    const r = await complete({ user_id: 9, ad_id: 1, view_token: s.body.view_token, watched_seconds: 30 });
    assert.equal(r.status, 500);
    assert.equal(one('SELECT view_status AS s FROM ad_views WHERE view_token = ?', s.body.view_token).s, 'STARTED');
    assert.equal(balance(9), 0);
    assert.equal(one('SELECT spent_xu AS s FROM ads WHERE ad_id = 1').s, 0);
    assert.equal(stats.leaked, 0);
  });

  it('EXT-31 | CSDL lỗi khi từ chối đơn: đơn vẫn PENDING, chưa hoàn xu, chưa trả kho', async () => {
    const u = addUserWithLedger(20000);
    const id = await newOrder(u, 4);
    const stockBefore = stock(4);
    injectFault(/INSERT INTO xu_transactions/i);
    const p = await processOrder(id, { action: 'REJECT', admin_id: 1 });
    assert.equal(p.status, 500);
    assert.equal(orderOf(id).status, 'PENDING');
    assert.equal(balance(u), 10000);
    assert.equal(stock(4), stockBefore);
    assert.equal(stats.leaked, 0);
  });
});
