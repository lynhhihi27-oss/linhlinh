import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSession } from '@/lib/auth';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request, { params }) {
  let connection;
  let inTransaction = false;
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;
    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã nhiệm vụ không hợp lệ.' }, { status: 400 });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    inTransaction = true;
    const date = today();
    const [tasks] = await connection.execute(
      `SELECT TaskID, Title, RewardXu, TaskType, TargetCount
       FROM DailyTasks WHERE TaskID = ? AND IsActive = 1`,
      [params.id]
    );
    if (tasks.length === 0) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhiệm vụ đang hoạt động.' }, { status: 404 });
    }
    const task = tasks[0];
    const [existingClaims] = await connection.execute(
      `SELECT UserDailyTaskID FROM UserDailyTasks
       WHERE UserID = ? AND TaskID = ? AND TaskDate = ? FOR UPDATE`,
      [auth.user.user_id, task.TaskID, date]
    );
    if (existingClaims.length > 0) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({ success: false, message: 'Bạn đã nhận thưởng nhiệm vụ này hôm nay.' }, { status: 409 });
    }

    let progress = 1;
    if (task.TaskType === 'VALID_AD_VIEWS') {
      const [viewCounts] = await connection.execute(
        `SELECT COUNT(*) AS completed_views FROM ad_views
         WHERE user_id = ? AND view_date = ? AND view_status = 'COMPLETED'`,
        [auth.user.user_id, date]
      );
      progress = Number(viewCounts[0]?.completed_views || 0);
    }
    if (progress < Number(task.TargetCount)) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({
        success: false,
        message: 'Bạn chưa hoàn thành đủ điều kiện nhận nhiệm vụ.',
        progress: Math.min(progress, Number(task.TargetCount)),
        target: Number(task.TargetCount)
      }, { status: 409 });
    }

    const [users] = await connection.execute(
      'SELECT xu_balance FROM users WHERE user_id = ? FOR UPDATE',
      [auth.user.user_id]
    );
    if (users.length === 0) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }
    const balanceAfter = Number(users[0].xu_balance) + Number(task.RewardXu);
    await connection.execute(
      'UPDATE users SET xu_balance = ? WHERE user_id = ?',
      [balanceAfter, auth.user.user_id]
    );
    const [claimResult] = await connection.execute(
      `INSERT INTO UserDailyTasks (UserID, TaskID, TaskDate, Progress, ClaimedAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [auth.user.user_id, task.TaskID, date, progress]
    );
    const [transactionResult] = await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, NULL, NULL, 'BONUS', ?, ?, ?, NOW())`,
      [auth.user.user_id, task.RewardXu, balanceAfter, `Nhiệm vụ hằng ngày: ${task.Title}`]
    );
    await connection.execute(
      `INSERT INTO TaskRewards (UserDailyTaskID, UserID, Amount, TransactionID)
       VALUES (?, ?, ?, ?)`,
      [claimResult.insertId, auth.user.user_id, task.RewardXu, transactionResult.insertId]
    );
    await connection.execute(
      `INSERT INTO Notifications (UserID, Title, Message, Type, IsRead, CreatedAt)
       VALUES (?, ?, ?, 'XU_EARNED', 0, NOW())`,
      [auth.user.user_id, 'Bạn vừa nhận Xu', `Bạn nhận ${task.RewardXu} Xu từ nhiệm vụ "${task.Title}".`]
    );
    await connection.commit();
    inTransaction = false;
    return NextResponse.json({
      success: true,
      message: `Đã nhận ${task.RewardXu} Xu từ nhiệm vụ.`,
      balance_after: balanceAfter
    });
  } catch (error) {
    if (connection && inTransaction) await connection.rollback();
    console.error('Daily task claim error:', error);
    return NextResponse.json({ success: false, message: 'Không thể nhận thưởng nhiệm vụ lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
