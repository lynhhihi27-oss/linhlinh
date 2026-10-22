import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { user_id, ad_id, view_token, watched_seconds } = body;

    if (!user_id || !ad_id || !view_token) {
      return NextResponse.json({ success: false, message: 'Thiếu dữ liệu xác thực phiên xem!' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Kiểm tra bản ghi lượt xem
    const [views] = await connection.execute(
      `SELECT view_id, user_id, ad_id, view_token, view_status, reward_xu, started_at
       FROM ad_views 
       WHERE view_token = ? FOR UPDATE`,
      [view_token]
    );

    if (views.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Token phiên xem không hợp lệ!' }, { status: 400 });
    }

    const currentView = views[0];

    if (currentView.view_status === 'COMPLETED') {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Lượt xem này đã được nhận xu trước đó (Idempotent)!' }, { status: 400 });
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
    const secondsWatched = parseInt(watched_seconds || 0);
    if (secondsWatched < ad.duration_sec) {
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

    // 6. Ghi sổ cái XU_TRANSACTIONS loại EARN cho người xem
    await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, ?, NULL, 'EARN', ?, ?, ?, NOW())`,
      [user_id, currentView.view_id, reward, newBalance, `Xem hoàn tất quảng cáo: ${ad.title}`]
    );

    // 7. HOA HỒNG AFFILIATE (Người giới thiệu nhận hoa hồng 20% khi bạn bè xem video)
    const [viewerInfo] = await connection.execute(
      'SELECT full_name, referred_by FROM users WHERE user_id = ?',
      [user_id]
    );

    const referrerId = viewerInfo[0]?.referred_by;
    let affiliateBonus = 0;

    if (referrerId) {
      // 20% hoa hồng từ lượt xem (tối thiểu 1 xu)
      const commissionRate = 0.20;
      affiliateBonus = Math.max(1, Math.round(reward * commissionRate));

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
           VALUES (?, ?, NULL, 'BONUS', ?, ?, ?, NOW())`,
          [
            referrerId,
            currentView.view_id,
            affiliateBonus,
            newRefBalance,
            `Hoa hồng Affiliate (${Math.round(commissionRate * 100)}%): Bạn bè [${viewerInfo[0].full_name}] hoàn tất video: ${ad.title}`
          ]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Chúc mừng bạn đã hoàn thành video và nhận được +${reward} xu!`,
      reward_xu: reward,
      balance_after: newBalance
    });
  } catch (error) {
    await connection.rollback();
    console.error('API views/complete error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
