import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Dữ liệu hồ sơ không hợp lệ.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu hồ sơ không hợp lệ.' }, { status: 400 });
    }

    const allowedFields = ['full_name', 'phone', 'gender', 'province'];
    const fields = Object.keys(body);
    if (fields.length === 0 || fields.some(field => !allowedFields.includes(field))) {
      return NextResponse.json({ success: false, message: 'Các trường hồ sơ được gửi lên không hợp lệ.' }, { status: 400 });
    }

    const updates = [];
    const values = [];
    if (Object.hasOwn(body, 'full_name')) {
      if (typeof body.full_name !== 'string' || !body.full_name.trim() || body.full_name.trim().length > 100) {
        return NextResponse.json({ success: false, message: 'Họ tên phải có từ 1 đến 100 ký tự.' }, { status: 400 });
      }
      updates.push('full_name = ?');
      values.push(body.full_name.trim());
    }
    if (Object.hasOwn(body, 'phone')) {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (!/^\+?\d{9,15}$/.test(phone)) {
        return NextResponse.json({ success: false, message: 'Số điện thoại không hợp lệ.' }, { status: 400 });
      }
      const existing = await query(
        'SELECT user_id FROM users WHERE phone = ? AND user_id <> ?',
        [phone, auth.user.user_id]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: false, message: 'Số điện thoại đã được sử dụng.' }, { status: 409 });
      }
      updates.push('phone = ?');
      values.push(phone);
    }
    if (Object.hasOwn(body, 'gender')) {
      if (!['MALE', 'FEMALE', 'OTHER'].includes(body.gender)) {
        return NextResponse.json({ success: false, message: 'Giới tính không hợp lệ.' }, { status: 400 });
      }
      updates.push('gender = ?');
      values.push(body.gender);
    }
    if (Object.hasOwn(body, 'province')) {
      if (typeof body.province !== 'string' || body.province.trim().length > 50) {
        return NextResponse.json({ success: false, message: 'Tỉnh/thành phố không hợp lệ.' }, { status: 400 });
      }
      updates.push('province = ?');
      values.push(body.province.trim() || null);
    }

    values.push(auth.user.user_id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);

    const users = await query(
      `SELECT user_id, email, phone, referral_code, full_name, birth_year, gender, province,
              system_role, account_status, xu_balance, referred_by, created_at
       FROM users WHERE user_id = ?`,
      [auth.user.user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật hồ sơ.',
      user: users[0]
    });
  } catch (error) {
    if ([2601, 2627].includes(error.number)) {
      return NextResponse.json({ success: false, message: 'Số điện thoại đã được sử dụng.' }, { status: 409 });
    }
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật hồ sơ lúc này.' }, { status: 500 });
  }
}
