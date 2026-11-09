import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã yêu cầu hỗ trợ không hợp lệ.' }, { status: 400 });
    }
    let sql = `SELECT t.TicketID, t.UserID, t.Category, t.Subject, t.Description, t.TransactionCode,
                      t.Status, t.CreatedAt, t.UpdatedAt, u.full_name
               FROM SupportTickets t JOIN users u ON u.user_id = t.UserID
               WHERE t.TicketID = ?`;
    const values = [params.id];
    if (auth.user.system_role !== 'ADMIN') {
      sql += ' AND t.UserID = ?';
      values.push(auth.user.user_id);
    }
    const tickets = await query(sql, values);
    if (tickets.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu hỗ trợ.' }, { status: 404 });
    }
    const replies = await query(
      `SELECT r.ReplyID, r.ResponderID, r.Message, r.CreatedAt, u.full_name AS responder_name
       FROM SupportReplies r JOIN users u ON u.user_id = r.ResponderID
       WHERE r.TicketID = ? ORDER BY r.CreatedAt, r.ReplyID`,
      [params.id]
    );
    return NextResponse.json({ success: true, ticket: tickets[0], replies });
  } catch (error) {
    console.error('Support detail GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải chi tiết yêu cầu hỗ trợ lúc này.' }, { status: 500 });
  }
}
