import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    const userId = auth.user.user_id;

    // 1. Số dư và thông tin ví
    const users = await query('SELECT user_id, full_name, referral_code, xu_balance, account_status FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'Người dùng không tồn tại' }, { status: 404 });
    }

    const user = users[0];

    // 2. Thống kê biến động
    const stats = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_earned,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_spent
       FROM xu_transactions 
       WHERE user_id = ?`,
      [userId]
    );

    const referralStats = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE referred_by = ?) AS invited_users,
         (SELECT COALESCE(SUM(amount), 0) FROM xu_transactions
          WHERE user_id = ? AND txn_type = 'BONUS' AND view_id IS NOT NULL) AS referral_bonus_xu`,
      [userId, userId]
    );

    // 3. Sổ cái giao dịch
    const transactions = await query(
      `SELECT t.*, v.ad_id, a.title AS ad_title, r.reward_name
       FROM xu_transactions t
       LEFT JOIN ad_views v ON t.view_id = v.view_id
       LEFT JOIN ads a ON v.ad_id = a.ad_id
       LEFT JOIN redemptions red ON t.redemption_id = red.redemption_id
       LEFT JOIN rewards r ON red.reward_id = r.reward_id
       WHERE t.user_id = ?
       ORDER BY t.txn_id DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      balance: user.xu_balance,
      total_earned: stats[0]?.total_earned || 0,
      total_spent: stats[0]?.total_spent || 0,
      referrals: {
        code: user.referral_code,
        invited_users: referralStats[0]?.invited_users || 0,
        bonus_xu: referralStats[0]?.referral_bonus_xu || 0
      },
      transactions
    });
  } catch (error) {
    console.error('API wallet error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
