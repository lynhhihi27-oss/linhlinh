import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { ad_id, device_id } = body;

    if (!ad_id) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin quảng cáo!' }, { status: 400 });
    }
    const user_id = auth.user.user_id;

    const today = new Date().toISOString().split('T')[0];

    // 1. Kiểm tra trạng thái tài khoản người dùng
    const users = await query('SELECT user_id, account_status, xu_balance FROM users WHERE user_id = ?', [user_id]);
    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'Tài khoản không tồn tại!' }, { status: 404 });
    }
    if (users[0].account_status === 'LOCKED') {
      return NextResponse.json({ success: false, message: 'Tài khoản của bạn đang bị khóa do nghi vấn vi phạm quy chế hệ thống!' }, { status: 403 });
    }

    // 2. Kiểm tra giới hạn trần ngày (UC-01: Tối đa 50 lượt hoặc 500 xu/ngày)
    const dailyStats = await query(
      `SELECT COUNT(*) AS total_views, COALESCE(SUM(reward_xu), 0) AS total_xu 
       FROM ad_views 
       WHERE user_id = ? AND view_date = ? AND view_status = 'COMPLETED'`,
      [user_id, today]
    );

    const viewsToday = dailyStats[0]?.total_views || 0;
    const xuToday = dailyStats[0]?.total_xu || 0;

    if (viewsToday >= 50 || xuToday >= 500) {
      return NextResponse.json({
        success: false,
        message: 'Bạn đã đạt giới hạn 50 lượt hoặc 500 xu nhận thưởng hôm nay. Vui lòng quay lại vào ngày mai!'
      }, { status: 400 });
    }

    // 3. Kiểm tra tính duy nhất trong ngày (Mỗi quảng cáo chỉ xem nhận xu 1 lần/ngày)
    const existingView = await query(
      `SELECT view_id, view_status FROM ad_views 
       WHERE user_id = ? AND ad_id = ? AND view_date = ? AND view_status = 'COMPLETED' LIMIT 1`,
      [user_id, ad_id, today]
    );

    if (existingView.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Bạn đã nhận thưởng cho quảng cáo này trong ngày hôm nay rồi!'
      }, { status: 400 });
    }

    // 4. Kiểm tra quảng cáo còn hoạt động & ngân sách
    const ads = await query(
      `SELECT ad_id, title, video_url, duration_sec, reward_xu, budget_xu, spent_xu, status 
       FROM ads WHERE ad_id = ?`,
      [ad_id]
    );

    if (ads.length === 0 || ads[0].status !== 'ACTIVE' || ads[0].spent_xu >= ads[0].budget_xu) {
      return NextResponse.json({ success: false, message: 'Quảng cáo hiện đã tạm dừng hoặc hết ngân sách phân phối!' }, { status: 400 });
    }

    const ad = ads[0];

    // 5. Sinh token và tạo lượt xem STARTED
    const viewToken = 'tok_' + crypto.randomBytes(16).toString('hex');
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const insertResult = await query(
      `MERGE ad_views WITH (HOLDLOCK) AS target
       USING (
         SELECT ? AS user_id, ? AS ad_id, ? AS view_token, ? AS view_date,
                ? AS reward_xu, ? AS device_id, ? AS ip_address
       ) AS source
       ON target.user_id = source.user_id AND target.ad_id = source.ad_id AND target.view_date = source.view_date
       WHEN MATCHED THEN
         UPDATE SET view_token = source.view_token, started_at = NOW(),
                    view_status = 'STARTED', watched_seconds = 0
       WHEN NOT MATCHED THEN
         INSERT (user_id, ad_id, view_token, view_date, started_at, watched_seconds, reward_xu, device_id, ip_address, view_status)
         VALUES (source.user_id, source.ad_id, source.view_token, source.view_date, NOW(), 0,
                 source.reward_xu, source.device_id, source.ip_address, 'STARTED')
       OUTPUT INSERTED.view_id AS insertId;`,
      [user_id, ad_id, viewToken, today, ad.reward_xu, device_id || 'BROWSER_CLIENT', ip]
    );

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo phiên xem thành công',
      view_id: insertResult.insertId || null,
      view_token: viewToken,
      duration_sec: ad.duration_sec,
      reward_xu: ad.reward_xu,
      video_url: ad.video_url,
      title: ad.title
    });
  } catch (error) {
    console.error('API views/start error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
