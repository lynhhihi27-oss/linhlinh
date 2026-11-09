import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function POST(request, { params }) {
  let connection;
  let inTransaction = false;
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;
    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã yêu cầu hỗ trợ không hợp lệ.' }, { status: 400 });
    }
    const body = await request.json();
    const message = body && typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length < 2 || message.length > 3000) {
      return NextResponse.json({ success: false, message: 'Phản hồi phải có từ 2 đến 3.000 ký tự.' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    inTransaction = true;
    const [tickets] = await connection.execute(
      'SELECT TicketID, UserID, Status FROM SupportTickets WHERE TicketID = ? FOR UPDATE',
      [params.id]
    );
    if (tickets.length === 0) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu hỗ trợ.' }, { status: 404 });
    }
    if (['RESOLVED', 'REJECTED'].includes(tickets[0].Status)) {
      await connection.rollback();
      inTransaction = false;
      return NextResponse.json({ success: false, message: 'Không thể phản hồi yêu cầu đã kết thúc.' }, { status: 409 });
    }
    await connection.execute(
      `INSERT INTO SupportReplies (TicketID, ResponderID, Message, CreatedAt)
       VALUES (?, ?, ?, NOW())`,
      [params.id, auth.user.user_id, message]
    );
    await connection.execute(
      `UPDATE SupportTickets SET Status = 'PROCESSING', UpdatedAt = NOW()
       WHERE TicketID = ? AND Status = 'PENDING'`,
      [params.id]
    );
    await connection.execute(
      `INSERT INTO Notifications (UserID, Title, Message, Type, IsRead, CreatedAt)
       VALUES (?, ?, ?, 'SUPPORT_REPLY', 0, NOW())`,
      [tickets[0].UserID, 'Admin đã phản hồi khiếu nại', `Có phản hồi mới cho yêu cầu #${params.id}.`]
    );
    await connection.commit();
    inTransaction = false;
    return NextResponse.json({ success: true, message: 'Đã gửi phản hồi.' });
  } catch (error) {
    if (connection && inTransaction) await connection.rollback();
    console.error('Support reply POST error:', error);
    return NextResponse.json({ success: false, message: 'Không thể gửi phản hồi lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
