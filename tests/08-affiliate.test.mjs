// Tính năng giới thiệu bạn bè / hoa hồng (nằm ngoài TC-01 nhưng ảnh hưởng trực tiếp số dư xu).
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  seedBase, call, one, rows, balance, redeem, watchFully, addUser, addUserWithLedger, ledgerViolations, db,
} from './helpers.mjs';

const processOrder = (id, body) => call('redemptions/[id]/process', 'PATCH', { params: { id }, body });

describe('Hoa hồng giới thiệu (AFF)', () => {
  beforeEach(() => seedBase());

  it('AFF-01 | bạn bè xem xong quảng cáo: người giới thiệu nhận 20% (tối thiểu 1 xu) bằng dòng BONUS, sổ cái khớp', async () => {
    const A = addUser({ xu_balance: 0 });
    const B = addUser({ referred_by: A });
    await watchFully(B, 1);                         // thưởng 10 xu -> hoa hồng 2
    await watchFully(B, 2);                         // thưởng 5 xu  -> hoa hồng 1
    assert.equal(balance(A), 3);
    assert.equal(rows("SELECT * FROM xu_transactions WHERE user_id = ? AND txn_type = 'BONUS'", A).length, 2);
    assert.deepEqual(ledgerViolations(A), []);
    assert.equal(balance(B), 15, 'hoa hồng không được trừ vào xu của người xem');
  });

  it('AFF-02 | bạn bè đổi quà: người giới thiệu nhận 5% (tối thiểu 50 xu)', async () => {
    const A = addUser({ xu_balance: 0 });
    const B = addUserWithLedger(1000, { referred_by: A });
    await redeem(B, 1);                             // 1.000 xu -> 5% = 50
    assert.equal(balance(A), 50);
  });

  it('AFF-03 | người giới thiệu bị khóa thì không nhận hoa hồng', async () => {
    const A = addUser({ xu_balance: 0, account_status: 'LOCKED' });
    const B = addUser({ referred_by: A });
    await watchFully(B, 1);
    assert.equal(balance(A), 0);
  });

  it('AFF-04 | đơn bị Admin từ chối (đã hoàn xu cho người đổi) thì hoa hồng của người giới thiệu cũng phải bị thu hồi', async () => {
    const A = addUser({ xu_balance: 0 });
    const B = addUserWithLedger(20000, { referred_by: A });
    await redeem(B, 4);                             // đơn 10.000 xu chờ duyệt -> A nhận 500 xu
    const id = one('SELECT redemption_id AS id FROM redemptions WHERE user_id = ?', B).id;
    await processOrder(id, { action: 'REJECT', admin_id: 1 });
    assert.equal(balance(B), 20000, 'người đổi đã được hoàn đủ xu');
    assert.equal(balance(A), 0,
      `Người giới thiệu vẫn giữ ${balance(A)} xu hoa hồng của đơn đã bị hủy -> mỗi vòng "đổi rồi hủy" tạo xu từ không khí (kết hợp thiếu xác thực thì lặp vô hạn)`);
  });

  it('AFF-05 | trang giới thiệu: tổng hoa hồng khớp ví người giới thiệu', async () => {
    const A = addUser({ xu_balance: 0 });
    const B = addUser({ referred_by: A });
    await watchFully(B, 1);
    const r = await call('affiliate', 'GET', { query: { userId: A } });
    assert.equal(r.status, 200, r.raw);
    assert.equal(r.body.stats.total_friends, 1);
    assert.equal(Number(r.body.stats.total_commission), balance(A));
    assert.equal(Number(r.body.stats.commission_from_views), 2);
  });

  it('AFF-06 | hoa hồng từng người bạn không bị nhân đôi khi hai bạn trùng họ tên', async () => {
    const A = addUser({ xu_balance: 0 });
    const B1 = addUser({ referred_by: A, full_name: 'Nguyễn Văn An' });
    const B2 = addUser({ referred_by: A, full_name: 'Nguyễn Văn An' });
    await watchFully(B1, 1);                        // chỉ B1 mang lại hoa hồng (2 xu)
    const r = await call('affiliate', 'GET', { query: { userId: A } });
    const f2 = r.body.friends.find(f => f.user_id === B2);
    assert.equal(Number(f2.commission_earned), 0,
      `Bạn #${B2} chưa xem gì nhưng hiển thị ${f2.commission_earned} xu hoa hồng: truy vấn ghép theo họ tên trong ghi chú (LIKE '%[tên]%')`);
  });
});
