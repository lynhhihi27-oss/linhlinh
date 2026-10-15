import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, phone, full_name, password, birth_year, gender, province, referral_code } = body;

    if (!email || !phone || !full_name || !password) {
      return NextResponse.json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' }, { status: 400 });
    }

    // Kiểm tra tuổi tối thiểu 16 (theo UC-03)
    const currentYear = new Date().getFullYear();
    if (birth_year && (currentYear - parseInt(birth_year) < 16)) {
      return NextResponse.json({ success: false, message: 'Người dùng phải từ đủ 16 tuổi trở lên để tham gia hệ thống!' }, { status: 400 });
    }

    // Kiểm tra trùng lặp email hoặc SĐT
    const existing = await query(
      'SELECT user_id FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone]
    );

    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Email hoặc Số điện thoại này đã được đăng ký trên hệ thống!' }, { status: 400 });
    }

    // Xử lý mã giới thiệu nếu có
    let referredBy = null;
    if (referral_code) {
      const refUser = await query('SELECT user_id FROM users WHERE user_id = ? OR phone = ? LIMIT 1', [referral_code, referral_code]);
      if (refUser.length > 0) {
        referredBy = refUser[0].user_id;
      }
    }

    // Password hash giả lập chuẩn bcrypt demo
    const passwordHash = '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG';

    const result = await query(
      `INSERT INTO users (email, phone, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'VIEWER', 'ACTIVE', 0, ?, NOW())`,
      [email, phone, full_name, passwordHash, birth_year || null, gender || 'OTHER', province || null, referredBy]
    );

    const newUserId = result.insertId;

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user_id: newUserId
    });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
