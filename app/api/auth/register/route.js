import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    let referrerName = null;
    if (referral_code && String(referral_code).trim()) {
      const cleanRef = String(referral_code).trim();
      const refUser = await query(
        'SELECT user_id, full_name, account_status FROM users WHERE referral_code = ? OR phone = ? OR user_id = ? LIMIT 1',
        [cleanRef, cleanRef, cleanRef]
      );
      if (refUser.length > 0 && refUser[0].account_status === 'ACTIVE') {
        referredBy = refUser[0].user_id;
        referrerName = refUser[0].full_name;
      }
    }

    // Password hash giả lập chuẩn bcrypt demo (123456)
    const passwordHash = '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG';
    const tempRefCode = 'YX' + Math.floor(10000000 + Math.random() * 90000000);

    const result = await query(
      `INSERT INTO users (email, phone, referral_code, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VIEWER', 'ACTIVE', 0, ?, NOW())`,
      [email, phone, tempRefCode, full_name, passwordHash, birth_year || null, gender || 'OTHER', province || null, referredBy]
    );

    const newUserId = result.insertId;
    const finalRefCode = 'YX' + String(newUserId).padStart(8, '0');
    await query('UPDATE users SET referral_code = ? WHERE user_id = ?', [finalRefCode, newUserId]);

    return NextResponse.json({
      success: true,
      message: referredBy 
        ? `Đăng ký thành công! Bạn đã được kết nối với người giới thiệu [${referrerName}].`
        : 'Đăng ký tài khoản thành công!',
      user_id: newUserId,
      referral_code: finalRefCode
    });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
