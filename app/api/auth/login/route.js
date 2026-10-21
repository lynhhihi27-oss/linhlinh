import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { assertSessionConfig, createSessionCookie, hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    assertSessionConfig();
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu đăng nhập không hợp lệ.' }, { status: 400 });
    }
    const { emailOrPhone, password } = body;

    if (
      typeof emailOrPhone !== 'string' || typeof password !== 'string' ||
      !emailOrPhone.trim() || emailOrPhone.trim().length > 100 ||
      !password || password.length > 128
    ) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập Email/Số điện thoại và Mật khẩu!'
      }, { status: 400 });
    }

    const users = await query(
      `SELECT user_id, email, phone, referral_code, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at
       FROM users 
       WHERE email = ? OR phone = ? 
       LIMIT 1`,
      [emailOrPhone.trim().toLowerCase(), emailOrPhone.trim()]
    );

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.'
      }, { status: 401 });
    }

    const user = users[0];
    const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.'
      }, { status: 401 });
    }

    const sessionCookie = createSessionCookie(user.user_id);
    if (needsRehash) {
      await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [await hashPassword(password), user.user_id]);
    }

    delete user.password_hash;
    const response = NextResponse.json({
      success: true,
      message: user.account_status === 'LOCKED'
        ? 'Đăng nhập thành công, nhưng tài khoản hiện đang bị khóa.'
        : 'Đăng nhập thành công!',
      user
    });
    response.headers.set('Set-Cookie', sessionCookie);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Không thể đăng nhập lúc này. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
