import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

const STATUSES = ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'];

export async function PATCH(request, { params }) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;
    if (!/^\d+$/.test(String(params.id)) || !Number.isSafeInteger(Number(params.id)) || Number(params.id) <= 0) {
      return NextResponse.json({ success: false, message: 'Mã yêu cầu hỗ trợ không hợp lệ.' }, { status: 400 });
    }
    const body = await request.json();
    if (!body || !STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái yêu cầu không hợp lệ.' }, { status: 400 });
    }
    const tickets = await query('SELECT TicketID FROM SupportTickets WHERE TicketID = ?', [params.id]);
    if (tickets.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu hỗ trợ.' }, { status: 404 });
    }
    await query(
      'UPDATE SupportTickets SET Status = ?, UpdatedAt = NOW() WHERE TicketID = ?',
      [body.status, params.id]
    );
    return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái yêu cầu hỗ trợ.' });
  } catch (error) {
    console.error('Support status PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật trạng thái lúc này.' }, { status: 500 });
  }
}
