// Kiểm thử bảo mật (TEST-01 §Bổ sung "Kiểm thử bảo mật") + API-01 §Xác thực và phân quyền:
//   "API yêu cầu JWT hợp lệ; kiểm tra role và quyền sở hữu ở phía máy chủ. Không tin role hoặc user_id do client tự gửi."
// Vì ứng dụng không phát hành token, danh tính "người gọi" được mô phỏng bằng header x-user-id
// (chính là quy ước mà route /auth/me đang dùng).
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedBase, call, one, balance, redeem, addUserWithLedger, dayOffset, as } from './helpers.mjs';

const validAd = () => ({
  advertiser_id: 2, category_id: 1, title: 'QC test', video_url: 'https://www.youtube.com/watch?v=abc123xyz00',
  duration_sec: 30, reward_xu: 10, budget_xu: 5000, start_date: dayOffset(1), end_date: dayOffset(30),
});
const newReward = () => ({ reward_name: 'Thẻ 500k', reward_type: 'PHONE_CARD', face_value_vnd: 500000, xu_cost: 1, stock_qty: 5 });

describe('Thiếu xác thực: mọi API phải trả 401 khi không có token hoặc token giả', () => {
  let orderId;
  beforeEach(async () => {
    seedBase();
    const u = addUserWithLedger(20000);
    await redeem(u, 4);                                           // tạo sẵn một đơn PENDING
    orderId = one('SELECT redemption_id AS id FROM redemptions').id;
  });

  const endpoints = () => [
    ['POST /api/redeem', 'redeem', 'POST', { body: { user_id: 5, reward_id: 1 } }],
    ['POST /api/views/start', 'views/start', 'POST', { body: { user_id: 5, ad_id: 1 } }],
    ['POST /api/views/complete', 'views/complete', 'POST', { body: { user_id: 5, ad_id: 1, view_token: 'tok_x', watched_seconds: 30 } }],
    ['GET /api/wallet', 'wallet', 'GET', { query: { userId: 5 } }],
    ['GET /api/auth/me', 'auth/me', 'GET', { query: { userId: 5 } }],
    ['GET /api/affiliate', 'affiliate', 'GET', { query: { userId: 5 } }],
    ['GET /api/redemptions', 'redemptions', 'GET', { query: { userId: 5 } }],
    ['GET /api/ads?role=ADMIN', 'ads', 'GET', { query: { role: 'ADMIN' } }],
    ['POST /api/ads', 'ads', 'POST', { body: validAd() }],
    ['PATCH /api/ads/[id]/status', 'ads/[id]/status', 'PATCH', { params: { id: 4 }, body: { status: 'ACTIVE' } }],
    ['PATCH /api/redemptions/[id]/process', 'redemptions/[id]/process', 'PATCH', { params: { id: orderId }, body: { action: 'APPROVE' } }],
    ['POST /api/rewards', 'rewards', 'POST', { body: newReward() }],
    ['GET /api/admin/stats', 'admin/stats', 'GET', {}],
    ['GET /api/admin/fraud', 'admin/fraud', 'GET', {}],
    ['POST /api/admin/fraud', 'admin/fraud', 'POST', { body: { action: 'TOGGLE_LOCK', target_user_id: 5 } }],
  ];

  // Số lượng endpoint cố định nên khai báo test bằng danh sách tĩnh (orderId chỉ có sau beforeEach).
  const labels = [
    'POST /api/redeem', 'POST /api/views/start', 'POST /api/views/complete', 'GET /api/wallet', 'GET /api/auth/me',
    'GET /api/affiliate', 'GET /api/redemptions', 'GET /api/ads?role=ADMIN', 'POST /api/ads', 'PATCH /api/ads/[id]/status',
    'PATCH /api/redemptions/[id]/process', 'POST /api/rewards', 'GET /api/admin/stats', 'GET /api/admin/fraud', 'POST /api/admin/fraud',
  ];
  labels.forEach((label, i) => {
    it(`SEC-${13 + i} | ${label} yêu cầu đăng nhập (không token / token giả → 401)`, async () => {
      const [, rel, method, opt] = endpoints()[i];
      const noToken = await call(rel, method, opt);
      const fake = await call(rel, method, { ...opt, headers: { authorization: 'Bearer fake.jwt.token' } });
      assert.equal(noToken.status, 401, `không có token -> HTTP ${noToken.status}`);
      assert.equal(fake.status, 401, `token giả -> HTTP ${fake.status}`);
    });
  });
});

describe('Phân quyền theo vai trò và quyền sở hữu (IDOR)', () => {
  beforeEach(() => seedBase());

  it('SEC-28 | Viewer không đọc được ví/lịch sử giao dịch của người khác', async () => {
    const r = await call('wallet', 'GET', { query: { userId: 8 }, headers: as(5) });
    assert.equal(r.status, 403, `Viewer #5 đọc được ví của #8 (số dư ${r.body?.balance}, ${r.body?.transactions?.length ?? 0} giao dịch): server tin ?userId`);
  });

  it('SEC-29 | Viewer không đọc được hồ sơ cá nhân (email, SĐT, số dư) của người khác', async () => {
    const r = await call('auth/me', 'GET', { query: { userId: 6 }, headers: as(5) });
    assert.equal(r.status, 403, `Viewer #5 đọc được hồ sơ #6: ${r.body?.user?.email} / ${r.body?.user?.phone}`);
  });

  it('SEC-30 | Viewer không xem được mã thẻ/voucher của người khác (qua ?role=ADMIN hoặc ?userId=)', async () => {
    const victim = addUserWithLedger(1500);
    const code = (await redeem(victim, 1)).body.gift_code;
    assert.ok(code, 'chuẩn bị dữ liệu: nạn nhân phải có mã thẻ');
    const leaks = [];
    for (const query of [{ role: 'ADMIN' }, { userId: victim }]) {
      const r = await call('redemptions', 'GET', { query, headers: as(5) });
      if (r.raw.includes(code)) leaks.push(JSON.stringify(query));
    }
    assert.deepEqual(leaks, [], `Mã thẻ ${code} của người khác bị lộ cho Viewer #5 qua: ${leaks.join(' ; ')} (mã thẻ = tiền thật)`);
  });

  it('SEC-31 | Viewer không thể đổi quà bằng xu của người khác (sửa user_id trong request)', async () => {
    const victim = addUserWithLedger(1500);
    const r = await call('redeem', 'POST', { body: { user_id: victim, reward_id: 1 }, headers: as(5) });
    assert.equal(balance(victim), 1500,
      `Viewer #5 trừ xu của nạn nhân và nhận mã ${r.body?.gift_code}: redeem tin user_id trong body`);
  });

  it('SEC-32 | Viewer không thể tự tạo quà tặng (ví dụ thẻ 500.000đ giá 1 xu)', async () => {
    const r = await call('rewards', 'POST', { body: newReward(), headers: as(5) });
    assert.equal(r.status, 403, `Viewer tạo được quà (HTTP ${r.status}) rồi có thể tự đổi với giá 1 xu`);
  });

  it('SEC-33 | Nhà quảng cáo không thể tự duyệt quảng cáo của chính mình', async () => {
    const r = await call('ads/[id]/status', 'PATCH', { params: { id: 4 }, body: { status: 'ACTIVE', reviewed_by: 1 }, headers: as(2) });
    assert.equal(r.status, 403, `Nhà QC #2 tự chuyển QC #4 sang ACTIVE (HTTP ${r.status}), bỏ qua bước Admin duyệt`);
  });

  it('SEC-34 | Viewer không thể khóa tài khoản hoặc thu hồi xu của người khác', async () => {
    const lock = await call('admin/fraud', 'POST', { body: { action: 'TOGGLE_LOCK', target_user_id: 8 }, headers: as(5) });
    const revoke = await call('admin/fraud', 'POST', { body: { action: 'REVOKE_XU', target_user_id: 8, revoke_amount: 1000 }, headers: as(5) });
    const st = one('SELECT account_status AS s, xu_balance AS b FROM users WHERE user_id = 8');
    assert.ok(lock.status === 403 && revoke.status === 403 && st.s === 'ACTIVE' && st.b === 2450,
      `Viewer #5 khóa được #8 (HTTP ${lock.status}) và thu hồi xu (HTTP ${revoke.status}): trạng thái=${st.s}, số dư=${st.b}`);
  });

  it('SEC-35 | Viewer không thể tự duyệt đơn đổi quà lớn của chính mình để lấy mã thẻ', async () => {
    const u = addUserWithLedger(20000);
    await redeem(u, 4);
    const id = one('SELECT redemption_id AS id FROM redemptions WHERE user_id = ?', u).id;
    const r = await call('redemptions/[id]/process', 'PATCH', { params: { id }, body: { action: 'APPROVE', admin_id: 1 }, headers: as(u) });
    assert.equal(r.status, 403, `Người xem tự duyệt đơn của mình (HTTP ${r.status}) và nhận mã ${r.body?.gift_code}`);
  });
});

describe('Kiểm tra dữ liệu đầu vào của API quản trị quà (EXT)', () => {
  beforeEach(() => seedBase());

  it('EXT-43 | tạo quà thiếu trường hoặc giá trị vô lý bị từ chối 4xx', async () => {
    const cases = {
      'thiếu tên quà': { reward_name: undefined },
      'thiếu loại quà': { reward_type: undefined },
      'xu_cost âm': { xu_cost: -5 },
      'xu_cost bằng 0': { xu_cost: 0 },
      'mệnh giá âm': { face_value_vnd: -1 },
      'tồn kho âm': { stock_qty: -3 },
    };
    const problems = [];
    for (const [label, o] of Object.entries(cases)) {
      const r = await call('rewards', 'POST', { body: { ...newReward(), ...o } });
      if (!(r.status >= 400 && r.status < 500)) problems.push(`${label} -> HTTP ${r.status}`);
    }
    assert.deepEqual(problems, [], 'POST /api/rewards không kiểm tra dữ liệu đầu vào:\n  ' + problems.join('\n  '));
  });
});
