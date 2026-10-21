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
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { reward_name, reward_type, face_value_vnd, xu_cost, stock_qty } = body;

    const result = await query(
      `INSERT INTO rewards (reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [reward_name, reward_type, face_value_vnd, xu_cost, stock_qty || 100]
    );

    return NextResponse.json({ success: true, message: 'Thêm phần thưởng mới thành công!', reward_id: result.insertId });
  } catch (error) {
    console.error('API rewards POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
