import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'VIEWER';
    const userId = searchParams.get('userId') || '5';
    const categoryId = searchParams.get('category');
    const status = searchParams.get('status');

    if (role === 'ADMIN') {
      let sql = `
        SELECT a.*, c.category_name, u.full_name AS advertiser_name
        FROM ads a
        JOIN ad_categories c ON a.category_id = c.category_id
        JOIN users u ON a.advertiser_id = u.user_id
      `;
      const params = [];
      if (status) {
        sql += ' WHERE a.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY a.ad_id DESC';
      const ads = await query(sql, params);
      return NextResponse.json({ success: true, ads });
    }

    if (role === 'ADVERTISER') {
      const sql = `
        SELECT a.*, c.category_name
        FROM ads a
        JOIN ad_categories c ON a.category_id = c.category_id
        WHERE a.advertiser_id = ?
        ORDER BY a.ad_id DESC
      `;
      const ads = await query(sql, [userId]);
      return NextResponse.json({ success: true, ads });
    }

    // Role: VIEWER hoặc GUEST: Lấy quảng cáo ACTIVE
    const today = new Date().toISOString().split('T')[0];
    let sql = `
      SELECT a.*, c.category_name, u.full_name AS advertiser_name,
        (SELECT COUNT(*) FROM ad_views v 
         WHERE v.ad_id = a.ad_id AND v.user_id = ? AND v.view_date = ? AND v.view_status = 'COMPLETED') AS viewed_today
      FROM ads a
      JOIN ad_categories c ON a.category_id = c.category_id
      JOIN users u ON a.advertiser_id = u.user_id
      WHERE a.status = 'ACTIVE' 
        AND a.spent_xu < a.budget_xu
        AND ? BETWEEN a.start_date AND a.end_date
    `;
    const params = [userId, today, today];

    if (categoryId) {
      sql += ' AND a.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY a.reward_xu DESC, a.ad_id DESC';
    const ads = await query(sql, params);

    return NextResponse.json({ success: true, ads });
  } catch (error) {
    console.error('API Ads GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      advertiser_id,
      category_id,
      title,
      video_url,
      duration_sec,
      reward_xu,
      budget_xu,
      start_date,
      end_date,
      target_gender,
      target_age_from,
      target_age_to,
      target_province
    } = body;

    // Ràng buộc nghiệp vụ UC-04
    if (!title || !video_url || !duration_sec || !budget_xu || !category_id) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập đầy đủ các trường thông tin chiến dịch!' }, { status: 400 });
    }

    const dur = parseInt(duration_sec);
    if (dur < 5 || dur > 60) {
      return NextResponse.json({ success: false, message: 'Thời lượng quảng cáo phải từ 5 đến 60 giây theo quy định!' }, { status: 400 });
    }

    const budget = parseInt(budget_xu);
    if (budget <= 0) {
      return NextResponse.json({ success: false, message: 'Ngân sách chiến dịch phải lớn hơn 0 xu!' }, { status: 400 });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ success: false, message: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu!' }, { status: 400 });
    }

    // Tự động gán mức xu thưởng theo khung thời lượng quy định (nếu chưa truyền)
    let finalReward = parseInt(reward_xu);
    if (!finalReward) {
      if (dur <= 15) finalReward = 5;
      else if (dur <= 30) finalReward = 10;
      else finalReward = 20;
    }

    // Tạo bản ghi ads với trạng thái PENDING (chờ Admin duyệt)
    const result = await query(
      `INSERT INTO ads (advertiser_id, category_id, title, video_url, duration_sec, reward_xu, budget_xu, spent_xu, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDING', NOW())`,
      [advertiser_id || 2, category_id, title, video_url, dur, finalReward, budget, start_date, end_date]
    );

    const newAdId = result.insertId;

    // Lưu cấu hình đối tượng mục tiêu (ad_targeting)
    if (target_gender || target_age_from || target_age_to || target_province) {
      await query(
        `INSERT INTO ad_targeting (ad_id, gender, age_from, age_to, province)
         VALUES (?, ?, ?, ?, ?)`,
        [newAdId, target_gender || null, target_age_from || null, target_age_to || null, target_province || null]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo chiến dịch thành công! Quảng cáo đã được gửi tới Quản trị viên để phê duyệt.',
      ad_id: newAdId
    });
  } catch (error) {
    console.error('API Ads POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
