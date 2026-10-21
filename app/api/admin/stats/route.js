import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;

    const userStats = await query(
      `SELECT 
         COUNT(*) AS total_users,
         SUM(CASE WHEN system_role = 'VIEWER' THEN 1 ELSE 0 END) AS total_viewers,
         SUM(CASE WHEN system_role = 'ADVERTISER' THEN 1 ELSE 0 END) AS total_advertisers,
         SUM(CASE WHEN account_status = 'LOCKED' THEN 1 ELSE 0 END) AS total_locked,
         COALESCE(SUM(xu_balance), 0) AS total_circulating_xu
       FROM users`
    );

    const adStats = await query(
      `SELECT 
         COUNT(*) AS total_ads,
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_ads,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_ads,
         SUM(CASE WHEN status = 'ENDED' THEN 1 ELSE 0 END) AS ended_ads,
         COALESCE(SUM(budget_xu), 0) AS total_budget_xu,
         COALESCE(SUM(spent_xu), 0) AS total_spent_xu
       FROM ads`
    );

    const viewStats = await query(
      `SELECT 
         COUNT(*) AS total_views,
         SUM(CASE WHEN view_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_views,
         SUM(CASE WHEN view_status = 'INVALID' THEN 1 ELSE 0 END) AS invalid_views
       FROM ad_views`
    );

    const redemptionStats = await query(
      `SELECT 
         COUNT(*) AS total_redemptions,
         SUM(CASE WHEN status = 'APPROVED' OR status = 'DELIVERED' THEN 1 ELSE 0 END) AS approved_redemptions,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_redemptions,
         COALESCE(SUM(xu_spent), 0) AS total_redeemed_xu
       FROM redemptions`
    );

    return NextResponse.json({
      success: true,
      stats: {
        users: userStats[0],
        ads: adStats[0],
        views: viewStats[0],
        redemptions: redemptionStats[0]
      }
    });
  } catch (error) {
    console.error('API stats error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
