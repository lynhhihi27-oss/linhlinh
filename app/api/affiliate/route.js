import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '5';

    // 1. Lấy thông tin user và mã giới thiệu
    const users = await query(
      'SELECT user_id, full_name, email, phone, referral_code, xu_balance FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'Người dùng không tồn tại' }, { status: 404 });
    }

    const user = users[0];
    const referralCode = user.referral_code || ('YX' + String(user.user_id).padStart(8, '0'));

    // 2. Thống kê tổng quan bạn bè đã giới thiệu
    const friendsCountRes = await query(
      'SELECT COUNT(*) AS total_friends FROM users WHERE referred_by = ?',
      [userId]
    );
    const totalFriends = friendsCountRes[0]?.total_friends || 0;

    // 3. Thống kê hoa hồng từ sổ cái XU_TRANSACTIONS
    const commissionStats = await query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_commission,
         COALESCE(SUM(CASE WHEN note LIKE '%hoàn tất video%' THEN amount ELSE 0 END), 0) AS commission_from_views,
         COALESCE(SUM(CASE WHEN note LIKE '%đổi quà%' THEN amount ELSE 0 END), 0) AS commission_from_redemptions
       FROM xu_transactions 
       WHERE user_id = ? AND txn_type = 'BONUS' AND note LIKE '%Hoa hồng Affiliate%'`,
      [userId]
    );

    const stats = {
      total_friends: totalFriends,
      total_commission: commissionStats[0]?.total_commission || 0,
      commission_from_views: commissionStats[0]?.commission_from_views || 0,
      commission_from_redemptions: commissionStats[0]?.commission_from_redemptions || 0
    };

    // 4. Danh sách chi tiết bạn bè đã mời
    const friends = await query(
      `SELECT 
         u.user_id, u.full_name, u.email, u.phone, u.created_at, u.xu_balance, u.account_status,
         (SELECT COUNT(*) FROM ad_views v WHERE v.user_id = u.user_id AND v.view_status = 'COMPLETED') AS total_views,
         (SELECT COUNT(*) FROM redemptions r WHERE r.user_id = u.user_id) AS total_redemptions,
         COALESCE((
           SELECT SUM(t.amount) 
           FROM xu_transactions t 
           WHERE t.user_id = ? AND t.txn_type = 'BONUS' AND t.note LIKE CONCAT('%[', u.full_name, ']%')
         ), 0) AS commission_earned
       FROM users u
       WHERE u.referred_by = ?
       ORDER BY u.user_id DESC`,
      [userId, userId]
    );

    // 5. Lịch sử nhận hoa hồng chi tiết
    const history = await query(
      `SELECT txn_id, amount, balance_after, note, created_at
       FROM xu_transactions 
       WHERE user_id = ? AND txn_type = 'BONUS' AND note LIKE '%Hoa hồng Affiliate%'
       ORDER BY txn_id DESC 
       LIMIT 30`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      referral_code: referralCode,
      user_name: user.full_name,
      stats,
      friends,
      history
    });
  } catch (error) {
    console.error('API Affiliate error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
