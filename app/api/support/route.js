import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const CATEGORIES = ['EARN_XU', 'REDEMPTION', 'ACCOUNT', 'AD', 'OTHER'];

export async function GET(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ticketSearch = searchParams.get('id');
    if (status && !['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái khiếu nại không hợp lệ.' }, { status: 400 });
    }
    if (ticketSearch && !/^\d+$/.test(ticketSearch)) {
      return NextResponse.json({ success: false, message: 'Mã yêu cầu tìm kiếm không hợp lệ.' }, { status: 400 });
    }

    let sql = `SELECT TOP (100) t.TicketID, t.UserID, t.Category, t.Subject, t.Description,
                      t.TransactionCode, t.Status, t.CreatedAt, t.UpdatedAt, u.full_name
               FROM SupportTickets t JOIN users u ON u.user_id = t.UserID`;
    const clauses = [];
    const params = [];
    if (auth.user.system_role !== 'ADMIN') {
      clauses.push('t.UserID = ?');
      params.push(auth.user.user_id);
    } else if (status) {
      clauses.push('t.Status = ?');
      params.push(status);
    }
    if (ticketSearch) {
      clauses.push('t.TicketID = ?');
      params.push(ticketSearch);
    }
    if (clauses.length) sql += ` WHERE ${clauses.join(' AND ')}`;
    sql += ' ORDER BY t.CreatedAt DESC, t.TicketID DESC';
    const tickets = await query(sql, params);
    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error('Support GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải yêu cầu hỗ trợ lúc này.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession(request, ['VIEWER', 'ADVERTISER']);
    if (auth.response) return auth.response;
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu yêu cầu hỗ trợ không hợp lệ.' }, { status: 400 });
    }
    const { category, subject, description, transaction_code: transactionCode = null } = body;
    if (
      !CATEGORIES.includes(category) ||
      typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 150 ||
      typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 3000 ||
      (transactionCode !== null && (typeof transactionCode !== 'string' || transactionCode.trim().length > 100))
    ) {
      return NextResponse.json({ success: false, message: 'Vui lòng kiểm tra loại vấn đề, tiêu đề, nội dung và mã giao dịch.' }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO SupportTickets (UserID, Category, Subject, Description, TransactionCode, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
      [auth.user.user_id, category, subject.trim(), description.trim(), transactionCode?.trim() || null]
    );
    return NextResponse.json({
      success: true,
      message: 'Đã gửi yêu cầu hỗ trợ.',
      ticket_id: result.insertId
    }, { status: 201 });
  } catch (error) {
    console.error('Support POST error:', error);
    return NextResponse.json({ success: false, message: 'Không thể gửi yêu cầu hỗ trợ lúc này.' }, { status: 500 });
  }
}
