import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { assertSessionConfig, createSessionCookie, hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    assertSessionConfig();
    const body = await request.json();
    const { email, phone, full_name, password, birth_year, gender, province, referral_code } = body;

    if (
      typeof email !== 'string' || typeof phone !== 'string' || typeof full_name !== 'string' ||
      typeof password !== 'string' || !email.trim() || !phone.trim() || !full_name.trim() || !birth_year
    ) {
      return NextResponse.json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự.' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const birthYear = Number(birth_year);
    if (!Number.isInteger(birthYear) || birthYear < 1900 || currentYear - birthYear < 16) {
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

    // Resolve an invite code once so an invalid code cannot silently discard attribution.
    let referredBy = null;
    if (referral_code) {
      const refUsers = await query(
        'SELECT user_id FROM users WHERE referral_code = ? LIMIT 1',
        [referral_code.trim().toUpperCase()]
      );
      if (refUsers.length === 0) {
        return NextResponse.json({ success: false, message: 'Mã giới thiệu không hợp lệ!' }, { status: 400 });
      }
      referredBy = refUsers[0].user_id;
    }

    const passwordHash = await hashPassword(password);
    const newReferralCode = `YX${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const result = await query(
      `INSERT INTO users (email, phone, referral_code, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VIEWER', 'ACTIVE', 0, ?, NOW())`,
      [email, phone, newReferralCode, full_name, passwordHash, birthYear, gender || 'OTHER', province || null, referredBy]
    );

    const newUserId = result.insertId;

    const users = await query(
      `SELECT user_id, email, phone, referral_code, full_name, birth_year, gender, province,
              system_role, account_status, xu_balance, referred_by, created_at
       FROM users WHERE user_id = ?`,
      [newUserId]
    );
    const response = NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user_id: newUserId,
      referral_code: newReferralCode,
      user: users[0]
    });
    response.headers.set('Set-Cookie', createSessionCookie(newUserId));
    return response;
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
