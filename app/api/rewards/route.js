import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function GET() {
  try {
    const rewards = await query(
      `SELECT reward_id, reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active
       FROM rewards
       WHERE is_active = 1
       ORDER BY xu_cost ASC`
    );
    return NextResponse.json({ success: true, rewards });
  } catch (error) {
    console.error('API rewards GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải danh sách quà lúc này.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu phần thưởng không hợp lệ.' }, { status: 400 });
    }
    const { reward_name, reward_type, face_value_vnd, xu_cost, stock_qty } = body;
    const faceValue = Number(face_value_vnd);
    const xuCost = Number(xu_cost);
    const stock = stock_qty === undefined || stock_qty === null ? 100 : Number(stock_qty);
    if (
      typeof reward_name !== 'string' || !reward_name.trim() || reward_name.trim().length > 150 ||
      !['PHONE_CARD', 'E_VOUCHER'].includes(reward_type) ||
      !Number.isSafeInteger(faceValue) || faceValue <= 0 ||
      !Number.isSafeInteger(xuCost) || xuCost <= 0 ||
      !Number.isSafeInteger(stock) || stock < 0
    ) {
      return NextResponse.json({ success: false, message: 'Thông tin phần thưởng không hợp lệ.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO rewards (reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [reward_name.trim(), reward_type, faceValue, xuCost, stock]
    );

    return NextResponse.json({ success: true, message: 'Thêm phần thưởng mới thành công!', reward_id: result.insertId });
  } catch (error) {
    console.error('API rewards POST error:', error);
    return NextResponse.json({ success: false, message: 'Không thể thêm phần quà lúc này.' }, { status: 500 });
  }
}
