import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  let connection;
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;
    connection = await pool.getConnection();

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu đổi quà không hợp lệ.' }, { status: 400 });
    }
    const { reward_id, request_key: requestKey } = body;
    const rewardId = Number(reward_id);
    const user_id = auth.user.user_id;

    if (
      !Number.isSafeInteger(rewardId) || rewardId <= 0 ||
      typeof requestKey !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)
    ) {
      return NextResponse.json({ success: false, message: 'Phần thưởng hoặc mã yêu cầu không hợp lệ.' }, { status: 400 });
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

    const [previousRequests] = await connection.execute(
      `SELECT redemption_id, user_id, reward_id, status, gift_code
       FROM redemptions WHERE request_key = ? FOR UPDATE`,
      [requestKey]
    );
    if (previousRequests.length > 0) {
      const previous = previousRequests[0];
      await connection.rollback();
      if (Number(previous.user_id) !== Number(user_id) || Number(previous.reward_id) !== rewardId) {
        return NextResponse.json({ success: false, message: 'Mã yêu cầu đã được dùng cho một giao dịch khác.' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        message: previous.status === 'REJECTED'
          ? 'Yêu cầu này đã được xử lý và từ chối trước đó.'
          : 'Yêu cầu đổi quà này đã được ghi nhận trước đó.',
        redemption_id: previous.redemption_id,
        status: previous.status,
        gift_code: previous.gift_code,
        balance_after: user.xu_balance
      });
    }

    // 2. Kiểm tra phần thưởng và tồn kho
    const [rewards] = await connection.execute(
      'SELECT reward_id, reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active FROM rewards WHERE reward_id = ? FOR UPDATE',
      [rewardId]
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

    // 4. Trừ xu người dùng và giảm tồn kho
    const newBalance = user.xu_balance - reward.xu_cost;
    await connection.execute(
      'UPDATE users SET xu_balance = ? WHERE user_id = ?',
      [newBalance, user_id]
    );

    await connection.execute(
      'UPDATE rewards SET stock_qty = stock_qty - 1 WHERE reward_id = ?',
      [rewardId]
    );

    // 5. Tạo đơn đổi thưởng (REDEMPTIONS)
    const [redemptionResult] = await connection.execute(
      `INSERT INTO redemptions (user_id, reward_id, request_key, xu_spent, gift_code, status, requested_at, processed_at, processed_by)
       VALUES (?, ?, ?, ?, NULL, 'PENDING', NOW(), NULL, NULL)`,
      [user_id, rewardId, requestKey, reward.xu_cost]
    );

    const redemptionId = redemptionResult.insertId;

    // 6. Ghi sổ cái XU_TRANSACTIONS loại REDEEM
    await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, NULL, ?, 'REDEEM', ?, ?, ?, NOW())`,
      [user_id, redemptionId, -reward.xu_cost, newBalance, `Đổi ${reward.reward_name}`]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Đã gửi yêu cầu đổi quà. Xu và tồn kho được giữ chỗ; quản trị viên sẽ xác nhận mã quà thực tế.',
      redemption_id: redemptionId,
      status: 'PENDING',
      gift_code: null,
      balance_after: newBalance
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Redeem error:', error);
    return NextResponse.json({ success: false, message: 'Không thể xử lý yêu cầu đổi quà lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
