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
    const { ad_id, view_token } = body;
    const user_id = auth.user.user_id;

    if (!ad_id || !view_token) {
      return NextResponse.json({ success: false, message: 'Thiếu dữ liệu xác thực phiên xem!' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Kiểm tra bản ghi lượt xem
    const [views] = await connection.execute(
      `SELECT view_id, user_id, ad_id, view_token, view_status, reward_xu, started_at,
              DATEDIFF(MILLISECOND, started_at, GETDATE()) AS elapsed_milliseconds
       FROM ad_views 
       WHERE view_token = ? FOR UPDATE`,
      [view_token]
    );

    if (views.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Token phiên xem không hợp lệ!' }, { status: 400 });
    }

    const currentView = views[0];
    if (Number(currentView.user_id) !== Number(user_id) || Number(currentView.ad_id) !== Number(ad_id)) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Phiên xem không thuộc tài khoản hoặc quảng cáo đã gửi!' }, { status: 403 });
    }

    if (currentView.view_status === 'COMPLETED') {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Lượt xem này đã được nhận xu trước đó (Idempotent)!' }, { status: 400 });
    }

    if (currentView.view_status !== 'STARTED') {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Phiên xem không còn hợp lệ.' }, { status: 400 });
    }

    const [viewers] = await connection.execute(
      'SELECT user_id, full_name, referred_by FROM users WHERE user_id = ? FOR UPDATE',
      [currentView.user_id]
    );
    if (viewers.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy người xem!' }, { status: 404 });
    }

    // 2. Lấy thông tin quảng cáo
    const [ads] = await connection.execute(
      `SELECT ad_id, title, duration_sec, reward_xu, budget_xu, spent_xu 
       FROM ads WHERE ad_id = ? FOR UPDATE`,
      [ad_id]
    );

    if (ads.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy quảng cáo!' }, { status: 404 });
    }

    const ad = ads[0];

    // Kiểm tra thời lượng đã xem phía server
    const elapsedSeconds = Math.floor(Number(currentView.elapsed_milliseconds) / 1000);
    const secondsWatched = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    if (!Number.isFinite(elapsedSeconds) || secondsWatched < ad.duration_sec) {
      // Đánh dấu INVALID nếu chưa xem đủ thời gian
      await connection.execute(
        `UPDATE ad_views SET view_status = 'INVALID', watched_seconds = ? WHERE view_id = ?`,
        [secondsWatched, currentView.view_id]
      );
      await connection.commit();
      return NextResponse.json({
        success: false,
        message: `Bạn chưa xem đủ ${ad.duration_sec} giây quy định. Lượt xem không hợp lệ!`
      }, { status: 400 });
    }

    const reward = ad.reward_xu;
    if (ad.spent_xu + reward > ad.budget_xu) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Quảng cáo đã hết ngân sách.' }, { status: 400 });
    }

    // 3. Cập nhật bản ghi ad_views sang COMPLETED
    await connection.execute(
      `UPDATE ad_views 
       SET view_status = 'COMPLETED', 
           completed_at = NOW(), 
           watched_seconds = ?,
           reward_xu = ?
       WHERE view_id = ?`,
      [secondsWatched, reward, currentView.view_id]
    );

    // 4. Tăng spent_xu trong ads
    await connection.execute(
      `UPDATE ads SET spent_xu = spent_xu + ? WHERE ad_id = ?`,
      [reward, ad_id]
    );

    // 5. Cộng xu cho người dùng và lấy số dư mới
    await connection.execute(
      `UPDATE users SET xu_balance = xu_balance + ? WHERE user_id = ?`,
      [reward, user_id]
    );

    const [updatedUsers] = await connection.execute(
      `SELECT xu_balance FROM users WHERE user_id = ?`,
      [user_id]
    );
    const newBalance = updatedUsers[0].xu_balance;

    // 6. Ghi sổ cái XU_TRANSACTIONS loại EARN
    await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, ?, NULL, 'EARN', ?, ?, ?, NOW())`,
      [user_id, currentView.view_id, reward, newBalance, `Xem hoàn tất quảng cáo: ${ad.title}`]
    );

    let referralBonusXu = 0;
    const referrerId = viewers[0].referred_by;
    if (referrerId !== null) {
      referralBonusXu = Math.max(1, Math.round(Number(reward) * 0.1));
      await connection.execute(
        'UPDATE users SET xu_balance = xu_balance + ? WHERE user_id = ?',
        [referralBonusXu, referrerId]
      );

      const [referrers] = await connection.execute(
        'SELECT xu_balance FROM users WHERE user_id = ?',
        [referrerId]
      );
      if (referrers.length === 0) {
        throw new Error('Không tìm thấy người giới thiệu của tài khoản.');
      }

      await connection.execute(
        `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
         VALUES (?, ?, NULL, 'BONUS', ?, ?, ?, NOW())`,
        [
          referrerId,
          currentView.view_id,
          referralBonusXu,
          referrers[0].xu_balance,
          `Thưởng giới thiệu 10% từ ${viewers[0].full_name}: ${ad.title}`
        ]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Chúc mừng bạn đã hoàn thành video và nhận được +${reward} xu!`,
      reward_xu: reward,
      balance_after: newBalance,
      referral_bonus_xu: referralBonusXu
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('API views/complete error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    connection?.release();
  }
}
