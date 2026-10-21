import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;

    // Lấy danh sách tài khoản nghi vấn: bị LOCKED hoặc có lượt xem INVALID
    const suspiciousUsers = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.account_status, u.xu_balance,
              COUNT(v.view_id) AS total_views,
              SUM(CASE WHEN v.view_status = 'INVALID' THEN 1 ELSE 0 END) AS invalid_views
       FROM users u
       LEFT JOIN ad_views v ON u.user_id = v.user_id
       WHERE u.system_role = 'VIEWER'
       GROUP BY u.user_id, u.full_name, u.email, u.phone, u.account_status, u.xu_balance
       ORDER BY invalid_views DESC, u.account_status ASC, u.user_id DESC`
    );

    // Lấy danh sách lượt xem INVALID gần đây
    const recentInvalidViews = await query(
      `SELECT v.*, u.full_name, u.email, a.title AS ad_title
       FROM ad_views v
       JOIN users u ON v.user_id = u.user_id
       JOIN ads a ON v.ad_id = a.ad_id
       WHERE v.view_status = 'INVALID'
       ORDER BY v.view_id DESC
       LIMIT 10`
    );

    return NextResponse.json({
      success: true,
      suspicious_users: suspiciousUsers,
      recent_invalid_views: recentInvalidViews
    });
  } catch (error) {
    console.error('Fraud API GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải báo cáo quản trị lúc này.' }, { status: 500 });
  }
}

export async function POST(request) {
  let connection;
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;
    connection = await pool.getConnection();

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
    }
    const { action, target_user_id, reason, revoke_amount } = body;
    const targetUserId = Number(target_user_id);
    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0 || targetUserId === auth.user.user_id) {
      return NextResponse.json({ success: false, message: 'Tài khoản mục tiêu không hợp lệ.' }, { status: 400 });
    }

    await connection.beginTransaction();

    if (action === 'TOGGLE_LOCK') {
      const [users] = await connection.execute('SELECT account_status FROM users WHERE user_id = ?', [targetUserId]);
      if (users.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
      }

      const newStatus = users[0].account_status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      await connection.execute('UPDATE users SET account_status = ? WHERE user_id = ?', [newStatus, targetUserId]);
      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `Đã ${newStatus === 'LOCKED' ? 'khóa tài khoản' : 'mở khóa tài khoản'} thành công!`,
        new_status: newStatus
      });
    }

    if (action === 'REVOKE_XU') {
      const [users] = await connection.execute('SELECT xu_balance FROM users WHERE user_id = ? FOR UPDATE', [targetUserId]);
      if (users.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
      }

      const currentBalance = users[0].xu_balance;
      const amountToRevoke = revoke_amount === undefined || revoke_amount === null
        ? currentBalance
        : Number(revoke_amount);

      if (!Number.isSafeInteger(amountToRevoke) || amountToRevoke <= 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: 'Số xu cần thu hồi phải lớn hơn 0!' }, { status: 400 });
      }

      const newBalance = Math.max(0, currentBalance - amountToRevoke);
      const actualDeducted = currentBalance - newBalance;

      await connection.execute('UPDATE users SET xu_balance = ? WHERE user_id = ?', [newBalance, targetUserId]);

      // Ghi sổ cái XU_TRANSACTIONS loại ADJUST
      await connection.execute(
        `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
         VALUES (?, NULL, NULL, 'ADJUST', ?, ?, ?, NOW())`,
        [targetUserId, -actualDeducted, newBalance, `Admin thu hồi xu gian lận: ${typeof reason === 'string' ? reason.slice(0, 200) : 'Vi phạm điều khoản xem'}`]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: `Đã thu hồi thành công ${actualDeducted} xu! Số dư hiện tại là ${newBalance} xu.`,
        new_balance: newBalance
      });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Fraud API POST error:', error);
    return NextResponse.json({ success: false, message: 'Không thể xử lý yêu cầu quản trị lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
