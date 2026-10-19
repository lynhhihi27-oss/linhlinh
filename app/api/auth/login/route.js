import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { emailOrPhone, password } = body;

    if (!emailOrPhone || !password) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập Email/Số điện thoại và Mật khẩu!'
      }, { status: 400 });
    }

    // Tìm kiếm người dùng theo Email hoặc Số điện thoại
    const users = await query(
      `SELECT user_id, email, phone, referral_code, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at
       FROM users 
       WHERE email = ? OR phone = ? 
       LIMIT 1`,
      [emailOrPhone.trim(), emailOrPhone.trim()]
    );

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống! Vui lòng kiểm tra lại.'
      }, { status: 401 });
    }

    const user = users[0];

    // Xác thực mật khẩu:
    // Hỗ trợ mật khẩu mẫu '123456' hoặc so sánh trực tiếp
    const isDefaultPassword = (password === '123456');
    const isHashMatched = (user.password_hash === password);
    const isBcryptSample = (user.password_hash === '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG');

    if (!isDefaultPassword && !isHashMatched && !(isBcryptSample && password === '123456')) {
      return NextResponse.json({
        success: false,
        message: 'Mật khẩu không chính xác! (Mật khẩu mặc định demo là: 123456)'
      }, { status: 401 });
    }

    // Thông báo nếu tài khoản bị khóa
    let alertMessage = 'Đăng nhập thành công!';
    if (user.account_status === 'LOCKED') {
      alertMessage = 'Tài khoản của bạn hiện đang bị KHÓA do nghi vấn vi phạm chính sách xem video!';
    }

    // Loại bỏ password_hash trước khi trả về client
    delete user.password_hash;

    return NextResponse.json({
      success: true,
      message: alertMessage,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
