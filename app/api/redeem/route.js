import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { user_id, reward_id } = body;

    if (!user_id || !reward_id) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin người dùng hoặc phần thưởng!' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Kiểm tra số dư người dùng
    const [users] = await connection.execute(
      'SELECT user_id, full_name, xu_balance, account_status FROM users WHERE user_id = ? FOR UPDATE',
      [user_id]
    );

    if (users.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng!' }, { status: 404 });
    }

    const user = users[0];
    if (user.account_status === 'LOCKED') {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Tài khoản đang bị khóa, không thể đổi quà!' }, { status: 403 });
    }

    // 2. Kiểm tra phần thưởng và tồn kho
    const [rewards] = await connection.execute(
      'SELECT reward_id, reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active FROM rewards WHERE reward_id = ? FOR UPDATE',
      [reward_id]
    );

    if (rewards.length === 0 || !rewards[0].is_active) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Phần thưởng không tồn tại hoặc đã tạm đóng!' }, { status: 404 });
    }

    const reward = rewards[0];

    if (reward.stock_qty <= 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Phần thưởng này hiện đã tạm hết hàng trong kho!' }, { status: 400 });
    }

    if (user.xu_balance < reward.xu_cost) {
      await connection.rollback();
      const lacking = reward.xu_cost - user.xu_balance;
      return NextResponse.json({
        success: false,
        message: `Bạn không đủ xu! Hiện có ${user.xu_balance} xu, còn thiếu ${lacking} xu để đổi phần quà này.`
      }, { status: 400 });
    }

    // 3. Quy tắc phê duyệt (UC-02):
    // Với quà <= 50.000đ -> Duyệt tự động (APPROVED) và sinh mã thẻ ngay.
    // Với quà > 50.000đ -> Chờ Admin phê duyệt (PENDING).
    let status = 'PENDING';
    let giftCode = null;

    if (reward.face_value_vnd <= 50000) {
      status = 'APPROVED';
      const codeSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      const codeMid = Math.floor(1000 + Math.random() * 9000);
      giftCode = `${reward.reward_type === 'PHONE_CARD' ? 'CARD' : 'VOUCHER'}-${codeMid}-${codeSuffix}`;
    }

    // 4. Trừ xu người dùng và giảm tồn kho
    const newBalance = user.xu_balance - reward.xu_cost;
    await connection.execute(
      'UPDATE users SET xu_balance = ? WHERE user_id = ?',
      [newBalance, user_id]
    );

    await connection.execute(
      'UPDATE rewards SET stock_qty = stock_qty - 1 WHERE reward_id = ?',
      [reward_id]
    );

    // 5. Tạo đơn đổi thưởng (REDEMPTIONS)
    const [redemptionResult] = await connection.execute(
      `INSERT INTO redemptions (user_id, reward_id, xu_spent, gift_code, status, requested_at, processed_at, processed_by)
       VALUES (?, ?, ?, ?, ?, NOW(), ${status === 'APPROVED' ? 'NOW()' : 'NULL'}, ${status === 'APPROVED' ? '1' : 'NULL'})`,
      [user_id, reward_id, reward.xu_cost, giftCode, status]
    );

    const redemptionId = redemptionResult.insertId;

    // 6. Ghi sổ cái XU_TRANSACTIONS loại REDEEM cho người đổi
    await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, NULL, ?, 'REDEEM', ?, ?, ?, NOW())`,
      [user_id, redemptionId, -reward.xu_cost, newBalance, `Đổi ${reward.reward_name}`]
    );

    // 7. HOA HỒNG AFFILIATE (Người giới thiệu nhận hoa hồng 5% khi bạn bè đổi quà)
    const [redeemerInfo] = await connection.execute(
      'SELECT full_name, referred_by FROM users WHERE user_id = ?',
      [user_id]
    );

    const referrerId = redeemerInfo[0]?.referred_by;
    let affiliateBonus = 0;

    if (referrerId) {
      // 5% số xu đổi quà của bạn bè (tối thiểu 50 xu)
      const commissionRate = 0.05;
      affiliateBonus = Math.max(50, Math.round(reward.xu_cost * commissionRate));

      const [referrerRows] = await connection.execute(
        'SELECT user_id, full_name, account_status, xu_balance FROM users WHERE user_id = ? FOR UPDATE',
        [referrerId]
      );

      if (referrerRows.length > 0 && referrerRows[0].account_status === 'ACTIVE') {
        const referrer = referrerRows[0];
        const newRefBalance = referrer.xu_balance + affiliateBonus;

        // Cộng xu vào ví người giới thiệu
        await connection.execute(
          'UPDATE users SET xu_balance = ? WHERE user_id = ?',
          [newRefBalance, referrerId]
        );

        // Ghi sổ cái XU_TRANSACTIONS loại BONUS cho người giới thiệu
        await connection.execute(
          `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
           VALUES (?, NULL, ?, 'BONUS', ?, ?, ?, NOW())`,
          [
            referrerId,
            redemptionId,
            affiliateBonus,
            newRefBalance,
            `Hoa hồng Affiliate (${Math.round(commissionRate * 100)}%): Bạn bè [${redeemerInfo[0].full_name}] đổi quà: ${reward.reward_name}`
          ]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: status === 'APPROVED' 
        ? `Đổi quà thành công! Mã thẻ/voucher của bạn là: ${giftCode}`
        : 'Đơn đổi thưởng đã gửi thành công! Do phần quà có giá trị > 50.000đ, hệ thống sẽ duyệt trong vòng 24 giờ.',
      status,
      gift_code: giftCode,
      balance_after: newBalance
    });
  } catch (error) {
    await connection.rollback();
    console.error('Redeem error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
