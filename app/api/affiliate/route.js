import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;

    const userId = Number(auth.user.user_id);
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const targetUserId = requestedUserId !== null ? Number(requestedUserId) : userId;

    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ success: false, message: 'Người dùng không hợp lệ.' }, { status: 400 });
    }

    if (auth.user.system_role !== 'ADMIN' && targetUserId !== userId) {
      return NextResponse.json({ success: false, message: 'Bạn không có quyền xem dữ liệu giới thiệu của người khác.' }, { status: 403 });
    }

    const statsRow = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE referred_by = ?) AS total_friends,
        (SELECT COALESCE(SUM(t.amount), 0) FROM xu_transactions t
         JOIN ad_views v ON v.view_id = t.view_id
         WHERE t.user_id = ? AND t.txn_type = 'BONUS' AND v.verified_at IS NOT NULL) AS commission_from_views,
        (SELECT COALESCE(SUM(amount), 0) FROM xu_transactions WHERE user_id = ? AND txn_type = 'BONUS' AND redemption_id IS NOT NULL) AS commission_from_redemptions,
        (SELECT COALESCE(SUM(t.amount), 0) FROM xu_transactions t
         WHERE t.user_id = ? AND t.txn_type = 'BONUS'
           AND (t.view_id IS NULL OR EXISTS (
             SELECT 1 FROM ad_views v WHERE v.view_id = t.view_id AND v.verified_at IS NOT NULL
           ))) AS total_commission`,
      [targetUserId, targetUserId, targetUserId, targetUserId]
    );

    const friendsRows = await query(
      `SELECT u.user_id, u.full_name, u.created_at,
              COALESCE(SUM(CASE WHEN x.txn_type = 'BONUS' AND x.view_id IS NOT NULL AND v.verified_at IS NOT NULL THEN x.amount ELSE 0 END), 0) AS commission_earned,
              COALESCE(COUNT(DISTINCT CASE WHEN v.view_status = 'COMPLETED' AND v.verified_at IS NOT NULL THEN v.view_id END), 0) AS completed_views
       FROM users u
       LEFT JOIN ad_views v ON v.user_id = u.user_id AND v.view_status = 'COMPLETED' AND v.verified_at IS NOT NULL
       LEFT JOIN xu_transactions x ON x.user_id = ? AND x.view_id = v.view_id AND x.txn_type = 'BONUS'
       WHERE u.referred_by = ?
       GROUP BY u.user_id, u.full_name, u.created_at
       ORDER BY u.user_id ASC`,
      [targetUserId, targetUserId]
    );

    const stats = {
      total_friends: Number(statsRow[0]?.total_friends || 0),
      commission_from_views: Number(statsRow[0]?.commission_from_views || 0),
      commission_from_redemptions: Number(statsRow[0]?.commission_from_redemptions || 0),
      total_commission: Number(statsRow[0]?.total_commission || 0),
    };

    return NextResponse.json({
      success: true,
      stats,
      friends: friendsRows.map((friend) => ({
        user_id: friend.user_id,
        full_name: friend.full_name,
        created_at: friend.created_at,
        commission_earned: Number(friend.commission_earned || 0),
        completed_views: Number(friend.completed_views || 0),
      }))
    });
  } catch (error) {
    console.error('Affiliate API error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải dữ liệu giới thiệu lúc này.' }, { status: 500 });
  }
}
