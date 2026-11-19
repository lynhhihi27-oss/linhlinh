import { NextResponse } from 'next/server.js';
import pool, { query } from '@/lib/db';
import { getSessionUser, requireSession } from '@/lib/auth';
import { vietnamDateKey } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getSessionUser(request);
    if (user && user.account_status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Tài khoản của bạn đang bị khóa.' }, { status: 403 });
    }
    const categoryId = searchParams.get('category');
    const status = searchParams.get('status');
    const requestedRole = searchParams.get('role');

    if (user?.system_role === 'ADMIN') {
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
      return NextResponse.json({ success: true, verification_mode: 'SANDBOX', ads });
    }
    if (user && ((requestedRole && requestedRole !== user.system_role && requestedRole !== 'VIEWER') || status)) {
      return NextResponse.json({ success: false, message: 'Bạn không có quyền truy cập danh sách chiến dịch theo yêu cầu.' }, { status: 403 });
    }
    if (user?.system_role === 'ADVERTISER') {
      const requestedUserId = searchParams.get('userId');
      if (requestedUserId !== null && Number(requestedUserId) !== Number(user.user_id)) {
        return NextResponse.json({ success: false, message: 'Bạn không có quyền xem chiến dịch của nhà quảng cáo khác.' }, { status: 403 });
      }
      const sql = `
        SELECT a.*, c.category_name
        FROM ads a
        JOIN ad_categories c ON a.category_id = c.category_id
        WHERE a.advertiser_id = ?
        ORDER BY a.ad_id DESC
      `;
      const ads = await query(sql, [user.user_id]);
      return NextResponse.json({ success: true, verification_mode: 'SANDBOX', ads });
    }

    const userId = user?.user_id ?? null;
    const today = vietnamDateKey();
    let sql = `
      SELECT a.*, c.category_name, u.full_name AS advertiser_name,
        (SELECT COUNT(*) FROM ad_views v 
         WHERE v.ad_id = a.ad_id AND v.user_id = ? AND v.view_date = ? AND v.view_status = 'COMPLETED'
           AND v.verified_at IS NOT NULL) AS viewed_today
      FROM ads a
      JOIN ad_categories c ON a.category_id = c.category_id
      JOIN users u ON a.advertiser_id = u.user_id
      WHERE a.status = 'ACTIVE' 
        AND a.spent_xu < a.budget_xu
        AND ? BETWEEN a.start_date AND a.end_date
    `;
    const params = [userId, today, today];

    if (userId !== null) {
      const viewer = await query('SELECT birth_year, gender, province FROM users WHERE user_id = ?', [userId]);
      const viewerData = viewer[0] || { birth_year: null, gender: null, province: null };
      const currentYear = new Date().getFullYear();
      const viewerAge = viewerData.birth_year != null ? currentYear - Number(viewerData.birth_year) : null;
      sql += ` AND (
        NOT EXISTS (
          SELECT 1 FROM ad_targeting restriction
          WHERE restriction.ad_id = a.ad_id
            AND (
              restriction.age_from IS NOT NULL OR restriction.age_to IS NOT NULL OR
              restriction.gender IS NOT NULL OR restriction.province IS NOT NULL
            )
        )
        OR EXISTS (
          SELECT 1 FROM ad_targeting target
          WHERE target.ad_id = a.ad_id
            AND (target.age_from IS NULL OR (? IS NOT NULL AND ? >= target.age_from))
            AND (target.age_to IS NULL OR (? IS NOT NULL AND ? <= target.age_to))
            AND (target.gender IS NULL OR target.gender = ?)
            AND (target.province IS NULL OR target.province = ?)
        )
      )`;
      params.push(
        viewerAge,
        viewerAge,
        viewerAge,
        viewerAge,
        viewerData.gender ?? null,
        viewerData.province ?? null
      );
    }

    if (categoryId) {
      sql += ' AND a.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY a.reward_xu DESC, a.ad_id DESC';
    const ads = await query(sql, params);

    return NextResponse.json({ success: true, verification_mode: 'SANDBOX', ads });
  } catch (error) {
    console.error('API Ads GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải quảng cáo lúc này.' }, { status: 500 });
  }
}

export async function POST(request) {
  let connection;
  try {
    const auth = await requireSession(request, ['ADVERTISER', 'ADMIN']);
    if (auth.response) return auth.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Dữ liệu chiến dịch không hợp lệ.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu chiến dịch không hợp lệ.' }, { status: 400 });
    }
    const {
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
    if (
      typeof title !== 'string' || !title.trim() || title.trim().length > 255 ||
      typeof video_url !== 'string' || !category_id || duration_sec === undefined || budget_xu === undefined
    ) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập đầy đủ các trường thông tin chiến dịch!' }, { status: 400 });
    }

    let parsedVideoUrl;
    try {
      parsedVideoUrl = new URL(video_url);
    } catch {
      return NextResponse.json({ success: false, message: 'Đường dẫn video YouTube không hợp lệ.' }, { status: 400 });
    }
    if (
      parsedVideoUrl.protocol !== 'https:' ||
      !['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(parsedVideoUrl.hostname.toLowerCase())
    ) {
      return NextResponse.json({ success: false, message: 'Chỉ chấp nhận đường dẫn video từ YouTube.' }, { status: 400 });
    }

    const dur = Number(duration_sec);
    if (!Number.isSafeInteger(dur) || dur < 5 || dur > 60) {
      return NextResponse.json({ success: false, message: 'Thời lượng quảng cáo phải từ 5 đến 60 giây theo quy định!' }, { status: 400 });
    }

    const budget = Number(budget_xu);
    if (!Number.isSafeInteger(budget) || budget <= 0) {
      return NextResponse.json({ success: false, message: 'Ngân sách chiến dịch phải lớn hơn 0 xu!' }, { status: 400 });
    }

    const categoryId = Number(category_id);
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ success: false, message: 'Danh mục quảng cáo không hợp lệ.' }, { status: 400 });
    }

    if (
      typeof start_date !== 'string' || typeof end_date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date) ||
      Number.isNaN(Date.parse(start_date)) || Number.isNaN(Date.parse(end_date)) ||
      new Date(start_date).toISOString().slice(0, 10) !== start_date ||
      new Date(end_date).toISOString().slice(0, 10) !== end_date
    ) {
      return NextResponse.json({ success: false, message: 'Ngày bắt đầu hoặc kết thúc không hợp lệ.' }, { status: 400 });
    }

    const ageFrom = target_age_from === '' || target_age_from == null ? null : Number(target_age_from);
    const ageTo = target_age_to === '' || target_age_to == null ? null : Number(target_age_to);
    if (
      (ageFrom !== null && (!Number.isInteger(ageFrom) || ageFrom < 16 || ageFrom > 120)) ||
      (ageTo !== null && (!Number.isInteger(ageTo) || ageTo < 16 || ageTo > 120)) ||
      (ageFrom !== null && ageTo !== null && ageFrom > ageTo)
    ) {
      return NextResponse.json({ success: false, message: 'Độ tuổi mục tiêu phải nằm trong khoảng 16-120 và tuổi tối thiểu không vượt quá tuổi tối đa!' }, { status: 400 });
    }

    if (target_gender && !['MALE', 'FEMALE', 'OTHER'].includes(target_gender)) {
      return NextResponse.json({ success: false, message: 'Giới tính mục tiêu không hợp lệ.' }, { status: 400 });
    }

    if (target_province !== undefined && target_province !== null && (typeof target_province !== 'string' || target_province.trim().length > 50)) {
      return NextResponse.json({ success: false, message: 'Tỉnh/thành phố mục tiêu không hợp lệ.' }, { status: 400 });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ success: false, message: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu!' }, { status: 400 });
    }

    // Tự động gán mức xu thưởng theo khung thời lượng quy định (nếu chưa truyền)
    let finalReward = reward_xu === '' || reward_xu === null || reward_xu === undefined ? 0 : Number(reward_xu);
    if (!Number.isSafeInteger(finalReward) || finalReward < 0) {
      return NextResponse.json({ success: false, message: 'Mức xu thưởng không hợp lệ.' }, { status: 400 });
    }
    if (!finalReward) {
      if (dur <= 15) finalReward = 5;
      else if (dur <= 30) finalReward = 10;
      else finalReward = 20;
    }
    const maxReward = dur <= 15 ? 5 : dur <= 30 ? 10 : 20;
    if (finalReward > maxReward) {
      return NextResponse.json({ success: false, message: `Mức thưởng tối đa cho quảng cáo ${dur} giây là ${maxReward} Xu.` }, { status: 400 });
    }
    if (budget < finalReward) {
      return NextResponse.json({ success: false, message: 'Ngân sách phải đủ chi trả ít nhất một lượt thưởng.' }, { status: 400 });
    }

    const categories = await query('SELECT category_id FROM ad_categories WHERE category_id = ?', [categoryId]);
    if (categories.length === 0) {
      return NextResponse.json({ success: false, message: 'Danh mục quảng cáo không tồn tại.' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [advertisers] = await connection.execute(
      'SELECT user_id, xu_balance FROM users WHERE user_id = ? FOR UPDATE',
      [auth.user.user_id]
    );
    if (advertisers.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản nhà quảng cáo.' }, { status: 404 });
    }
    if (Number(advertisers[0].xu_balance) < budget) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Số dư Xu không đủ để giữ chỗ ngân sách chiến dịch.' }, { status: 409 });
    }

    const balanceAfterReservation = Number(advertisers[0].xu_balance) - budget;
    await connection.execute('UPDATE users SET xu_balance = ? WHERE user_id = ?', [balanceAfterReservation, auth.user.user_id]);

    const [result] = await connection.execute(
      `INSERT INTO ads (advertiser_id, category_id, title, video_url, duration_sec, reward_xu, budget_xu, spent_xu, reserved_xu, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'PENDING', NOW())`,
      [auth.user.user_id, categoryId, title.trim(), video_url.trim(), dur, finalReward, budget, budget, start_date, end_date]
    );

    const newAdId = result.insertId;
    await connection.execute(
      `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
       VALUES (?, NULL, NULL, 'ADJUST', ?, ?, ?, NOW())`,
      [auth.user.user_id, -budget, balanceAfterReservation, `Giữ chỗ ngân sách chiến dịch #${newAdId}: ${title.trim().slice(0, 150)}`]
    );

    // Lưu cấu hình đối tượng mục tiêu (ad_targeting)
    if (target_gender || ageFrom !== null || ageTo !== null || target_province) {
      await connection.execute(
        `INSERT INTO ad_targeting (ad_id, gender, age_from, age_to, province)
         VALUES (?, ?, ?, ?, ?)`,
        [newAdId, target_gender || null, ageFrom, ageTo, target_province || null]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo chiến dịch thành công! Quảng cáo đã được gửi tới Quản trị viên để phê duyệt.',
      ad_id: newAdId,
      reserved_budget_xu: budget,
      balance_after: balanceAfterReservation
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('API Ads POST error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tạo chiến dịch lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
