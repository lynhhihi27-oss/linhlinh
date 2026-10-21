import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
  let connection;
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;
    connection = await pool.getConnection();

    const redemptionId = params.id;
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu xử lý đơn không hợp lệ.' }, { status: 400 });
    }
    const { action, gift_code: submittedGiftCode } = body;
    if (!/^\d+$/.test(String(redemptionId)) || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Thông tin xử lý đơn không hợp lệ.' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT r.*, rew.reward_name, rew.reward_type 
       FROM redemptions r 
       JOIN rewards rew ON r.reward_id = rew.reward_id 
       WHERE r.redemption_id = ? FOR UPDATE`,
      [redemptionId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy đơn đổi thưởng!' }, { status: 404 });
    }

    const order = orders[0];
    if (order.status !== 'PENDING') {
      await connection.rollback();
      return NextResponse.json({ success: false, message: `Đơn này đã được xử lý trước đó với trạng thái: ${order.status}` }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const giftCode = typeof submittedGiftCode === 'string' ? submittedGiftCode.trim() : '';
      if (!giftCode || giftCode.length > 50) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'Cần nhập mã quà thực tế do nhà cung cấp cấp (tối đa 50 ký tự).' }, { status: 400 });
      }

      await connection.execute(
        `UPDATE redemptions 
         SET status = 'APPROVED', gift_code = ?, processed_at = NOW(), processed_by = ? 
         WHERE redemption_id = ?`,
        [giftCode, auth.user.user_id, redemptionId]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: 'Đã phê duyệt đơn đổi quà và cấp mã thành công!',
        gift_code: giftCode
      });
    } else if (action === 'REJECT') {
      // Từ chối và hoàn xu lại vào ví người dùng (REFUND)
      await connection.execute(
        `UPDATE users SET xu_balance = xu_balance + ? WHERE user_id = ?`,
        [order.xu_spent, order.user_id]
      );

      const [users] = await connection.execute(
        'SELECT xu_balance FROM users WHERE user_id = ?',
        [order.user_id]
      );
      const newBalance = users[0].xu_balance;

      await connection.execute(
        `UPDATE redemptions 
         SET status = 'REJECTED', processed_at = NOW(), processed_by = ? 
         WHERE redemption_id = ?`,
        [auth.user.user_id, redemptionId]
      );

      // Ghi sổ cái XU_TRANSACTIONS loại REFUND
      await connection.execute(
        `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
         VALUES (?, NULL, ?, 'REFUND', ?, ?, ?, NOW())`,
        [order.user_id, redemptionId, order.xu_spent, newBalance, `Hoàn xu đơn đổi thưởng: ${order.reward_name} (Admin từ chối)`]
      );

      // Hoàn lại tồn kho 1 món
      await connection.execute(
        'UPDATE rewards SET stock_qty = stock_qty + 1 WHERE reward_id = ?',
        [order.reward_id]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: 'Đã từ chối đơn đổi quà và hoàn lại xu vào ví người dùng!',
        refunded_xu: order.xu_spent
      });
    } else {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Hành động không hợp lệ!' }, { status: 400 });
    }
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Process redemption error:', error);
    return NextResponse.json({ success: false, message: 'Không thể xử lý đơn đổi quà lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
