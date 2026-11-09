import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { parseReportPeriod, reportRange } from '@/lib/reporting';

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
    const timeFilter = range ? ' AND v.view_date >= ? AND v.view_date < ?' : '';
    const dates = range || [];
    const campaigns = await query(
      `SELECT a.ad_id, a.title, a.status, a.reward_xu, a.budget_xu, a.spent_xu,
              (SELECT COUNT(*) FROM ad_views v WHERE v.ad_id = a.ad_id${timeFilter}) AS total_views,
              (SELECT COUNT(*) FROM ad_views v WHERE v.ad_id = a.ad_id AND v.view_status = 'COMPLETED'${timeFilter}) AS valid_views,
              (SELECT COUNT(*) FROM ad_views v WHERE v.ad_id = a.ad_id AND v.view_status = 'INVALID'${timeFilter}) AS invalid_views
       FROM ads a WHERE a.advertiser_id = ? ORDER BY a.created_at DESC, a.ad_id DESC`,
      [...dates, ...dates, ...dates, auth.user.user_id]
    );
    return NextResponse.json({ success: true, period, campaigns });
  } catch (error) {
    console.error('Campaign reports GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải thống kê chiến dịch lúc này.' }, { status: 500 });
  }
}
