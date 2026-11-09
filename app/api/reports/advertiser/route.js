import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { chartRange, parseReportPeriod, reportRange, summarizeViews } from '@/lib/reporting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['ADVERTISER']);
    if (auth.response) return auth.response;
    const period = parseReportPeriod(request);
    if (!period) {
      return NextResponse.json({ success: false, message: 'Khoảng thời gian không hợp lệ.' }, { status: 400 });
    }

    const range = reportRange(period);
    const chart = chartRange(period);
    const viewFilter = range ? ' AND v.view_date >= ? AND v.view_date < ?' : '';
    const viewParams = range || [];
    const [campaigns, views, dailyViews] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total_campaigns,
                COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_campaigns
         FROM ads WHERE advertiser_id = ?`,
        [auth.user.user_id]
      ),
      query(
        `SELECT COUNT(v.view_id) AS total_views,
                COALESCE(SUM(CASE WHEN v.view_status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS valid_views,
                COALESCE(SUM(CASE WHEN v.view_status = 'INVALID' THEN 1 ELSE 0 END), 0) AS invalid_views
         FROM ads a LEFT JOIN ad_views v ON v.ad_id = a.ad_id${viewFilter}
         WHERE a.advertiser_id = ?`,
        [...viewParams, auth.user.user_id]
      ),
      query(
        `SELECT v.view_date, v.view_status
         FROM ad_views v JOIN ads a ON a.ad_id = v.ad_id
         WHERE a.advertiser_id = ? AND v.view_date >= ? AND v.view_date < ?`,
        [auth.user.user_id, ...chart]
      )
    ]);
    return NextResponse.json({
      success: true,
      period,
      stats: {
        total_campaigns: campaigns[0]?.total_campaigns || 0,
        active_campaigns: campaigns[0]?.active_campaigns || 0,
        total_views: views[0]?.total_views || 0,
        valid_views: views[0]?.valid_views || 0,
        invalid_views: views[0]?.invalid_views || 0
      },
      chart: summarizeViews(dailyViews)
    });
  } catch (error) {
    console.error('Advertiser reports GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải báo cáo nhà quảng cáo lúc này.' }, { status: 500 });
  }
}
