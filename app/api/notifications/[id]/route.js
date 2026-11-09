import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã thông báo không hợp lệ.' }, { status: 400 });
    }

    const notifications = await query(
      'SELECT NotificationID FROM Notifications WHERE NotificationID = ? AND UserID = ?',
      [params.id, auth.user.user_id]
    );
    if (notifications.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy thông báo.' }, { status: 404 });
    }

    await query(
      'UPDATE Notifications SET IsRead = 1 WHERE NotificationID = ? AND UserID = ?',
      [params.id, auth.user.user_id]
    );
    return NextResponse.json({ success: true, message: 'Đã đánh dấu thông báo đã đọc.' });
  } catch (error) {
    console.error('Notification PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật thông báo lúc này.' }, { status: 500 });
  }
}
