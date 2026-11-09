import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get('limit') || 30);
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      return NextResponse.json({ success: false, message: 'Số thông báo mỗi trang phải từ 1 đến 100.' }, { status: 400 });
    }
    const before = searchParams.get('before');
    if (before !== null && (!/^\d{1,19}$/.test(before) || !Number.isSafeInteger(Number(before)) || Number(before) <= 0)) {
      return NextResponse.json({ success: false, message: 'Mốc thông báo không hợp lệ.' }, { status: 400 });
    }

    let notificationSql = `SELECT TOP (${requestedLimit + 1}) NotificationID, Title, Message, Type, IsRead, CreatedAt
                           FROM Notifications WHERE UserID = ?`;
    const notificationParams = [auth.user.user_id];
    if (before !== null) {
      notificationSql += ' AND NotificationID < ?';
      notificationParams.push(before);
    }
    notificationSql += ' ORDER BY CreatedAt DESC, NotificationID DESC';
    const [selectedNotifications, counts] = await Promise.all([
      query(notificationSql, notificationParams),
      query('SELECT COUNT(*) AS unread_count FROM Notifications WHERE UserID = ? AND IsRead = 0', [auth.user.user_id])
    ]);
    const hasMore = selectedNotifications.length > requestedLimit;
    const notifications = selectedNotifications.slice(0, requestedLimit);
    return NextResponse.json({
      success: true,
      notifications,
      unread_count: counts[0]?.unread_count || 0,
      has_more: hasMore,
      next_cursor: hasMore && notifications.length ? String(notifications[notifications.length - 1].NotificationID) : null
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải thông báo lúc này.' }, { status: 500 });
  }
}
