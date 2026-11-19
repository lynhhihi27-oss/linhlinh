import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const auth = await requireSession(request, ['ADMIN', 'ADVERTISER']);
    if (auth.response) return auth.response;

    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã chiến dịch không hợp lệ.' }, { status: 400 });
    }

    const ads = await query(
      `SELECT ad_id, advertiser_id, title, status, budget_xu, spent_xu, reserved_xu,
              start_date, end_date, created_at
       FROM ads WHERE ad_id = ?`,
      [Number(params.id)]
    );
    if (ads.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy chiến dịch.' }, { status: 404 });
    }
    if (auth.user.system_role !== 'ADMIN' && Number(ads[0].advertiser_id) !== Number(auth.user.user_id)) {
      return NextResponse.json({ success: false, message: 'Bạn không có quyền xem báo cáo chiến dịch này.' }, { status: 403 });
    }

    const views = await query(
      `SELECT COUNT(*) AS total_views,
              COALESCE(SUM(CASE WHEN view_status = 'COMPLETED' AND verified_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS verified_views,
              COALESCE(SUM(CASE WHEN view_status = 'INVALID' THEN 1 ELSE 0 END), 0) AS invalid_views
       FROM ad_views WHERE ad_id = ?`,
      [Number(params.id)]
    );

    return NextResponse.json({
      success: true,
      verification_mode: 'SANDBOX',
      campaign: ads[0],
      report: {
        total_views: Number(views[0]?.total_views || 0),
        verified_views: Number(views[0]?.verified_views || 0),
        invalid_views: Number(views[0]?.invalid_views || 0),
        spent_xu: Number(ads[0].spent_xu || 0),
        reserved_xu: Number(ads[0].reserved_xu || 0)
      }
    });
  } catch (error) {
    console.error('Campaign report GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải báo cáo chiến dịch lúc này.' }, { status: 500 });
  }
}
