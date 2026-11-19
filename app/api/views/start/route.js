import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseDbTimestamp(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  const str = String(ts).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)
    ? `${str.replace(' ', 'T')}Z`
    : str;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? null : time;
}

function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

export async function POST(request) {
  const auth = await requireSession(request, ['VIEWER']);
  if (auth.response) return auth.response;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Dữ liệu bắt đầu xem không hợp lệ.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu bắt đầu xem không hợp lệ.' }, { status: 400 });
    }

    const { user_id, ad_id } = body;
    const userId = Number(user_id ?? auth.user.user_id);
    const adId = Number(ad_id);

    if (!Number.isSafeInteger(userId) || userId <= 0 || userId !== auth.user.user_id || !Number.isSafeInteger(adId) || adId <= 0) {
      return NextResponse.json({ success: false, message: 'Thông tin lượt xem không hợp lệ.' }, { status: 400 });
    }

    const ads = await query(
      `SELECT ad_id, status, reward_xu, budget_xu, spent_xu, duration_sec, start_date, end_date
       FROM ads WHERE ad_id = ?`,
      [adId]
    );
    if (ads.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy quảng cáo.' }, { status: 404 });
    }

    const ad = ads[0];
    if (ad.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Quảng cáo hiện không khả dụng.' }, { status: 409 });
    }
    const today = new Date().toISOString().split('T')[0];
    if (today < dateOnly(ad.start_date) || today > dateOnly(ad.end_date)) {
      return NextResponse.json({ success: false, message: 'Quảng cáo hiện ngoài thời gian chạy.' }, { status: 409 });
    }
    if (ad.spent_xu >= ad.budget_xu) {
      return NextResponse.json({ success: false, message: 'Quảng cáo đã hết ngân sách.' }, { status: 409 });
    }
    const todayCompleted = await query(
      `SELECT COUNT(*) AS c FROM ad_views
       WHERE user_id = ? AND ad_id = ? AND view_date = ? AND view_status = 'COMPLETED'
         AND verified_at IS NOT NULL`,
      [userId, adId, today]
    );
    if (Number(todayCompleted[0]?.c ?? 0) > 0) {
      return NextResponse.json({ success: false, message: 'Bạn đã xem quảng cáo này hôm nay rồi.' }, { status: 409 });
    }

    const dailyCount = await query(
      `SELECT COUNT(*) AS c FROM ad_views
       WHERE user_id = ? AND view_date = ? AND view_status = 'COMPLETED'
         AND verified_at IS NOT NULL`,
      [userId, today]
    );
    if (Number(dailyCount[0]?.c ?? 0) >= 50) {
      return NextResponse.json({ success: false, message: 'Bạn đã đạt giới hạn 50 lượt xem trong ngày.' }, { status: 429 });
    }

    const dailyEarn = await query(
      `SELECT COALESCE(SUM(reward_xu), 0) AS total FROM ad_views
       WHERE user_id = ? AND view_date = ? AND view_status = 'COMPLETED'
         AND verified_at IS NOT NULL`,
      [userId, today]
    );
    const totalTodayEarn = Number(dailyEarn[0]?.total ?? 0);
    if (totalTodayEarn + ad.reward_xu > 500) {
      return NextResponse.json({ success: false, message: 'Bạn đã đạt giới hạn 500 xu trong ngày.' }, { status: 429 });
    }

    const previous = await query(
      `SELECT view_id, started_at, completed_at, view_status FROM ad_views
       WHERE user_id = ? AND view_status = 'COMPLETED' AND verified_at IS NOT NULL
       ORDER BY view_id DESC LIMIT 1`,
      [userId]
    );
    const lastTime = previous[0]?.completed_at || previous[0]?.started_at;
    const lastStarted = parseDbTimestamp(lastTime);
    if (lastStarted) {
      const nowMs = Date.now();
      if (nowMs - lastStarted < 10000) {
        return NextResponse.json({ success: false, message: 'Bạn cần nghỉ ít nhất 10 giây trước khi xem quảng cáo khác.' }, { status: 429 });
      }
    }

    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const existingToday = await query(
      `SELECT view_id FROM ad_views WHERE user_id = ? AND ad_id = ? AND view_date = ?`,
      [userId, adId, today]
    );
    if (existingToday.length > 0) {
      await query(
        `UPDATE ad_views
         SET view_token = ?, started_at = CURRENT_TIMESTAMP, completed_at = NULL, watched_seconds = 0,
             reward_xu = ?, view_status = 'STARTED', verification_provider = NULL,
             verification_event_id = NULL, verified_at = NULL
         WHERE view_id = ?`,
        [token, ad.reward_xu, existingToday[0].view_id]
      );
    } else {
      await query(
        `INSERT INTO ad_views (user_id, ad_id, view_token, view_date, started_at, completed_at, watched_seconds, reward_xu, view_status)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, 0, ?, 'STARTED')`,
        [userId, adId, token, today, ad.reward_xu]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã mở phiên xem thử SANDBOX. Lượt xem chưa được nhà cung cấp xác minh và không thể nhận Xu.',
      verification_mode: 'SANDBOX',
      view_token: token,
      duration_sec: ad.duration_sec,
      reward_xu: ad.reward_xu,
      ad_id: ad.ad_id,
      user_id: userId
    }, { status: 200 });
  } catch (error) {
    console.error('View start error:', error);
    return NextResponse.json({ success: false, message: 'Không thể bắt đầu xem quảng cáo lúc này.' }, { status: 500 });
  }
}
