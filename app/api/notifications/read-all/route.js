import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    await query('UPDATE Notifications SET IsRead = 1 WHERE UserID = ? AND IsRead = 0', [auth.user.user_id]);
    return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả thông báo đã đọc.' });
  } catch (error) {
    console.error('Notifications read-all PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật thông báo lúc này.' }, { status: 500 });
  }
}
