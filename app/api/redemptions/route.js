import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'VIEWER';

    let sql = `
      SELECT r.*, rew.reward_name, rew.reward_type, rew.face_value_vnd, u.full_name, u.email, u.phone
      FROM redemptions r
      JOIN rewards rew ON r.reward_id = rew.reward_id
      JOIN users u ON r.user_id = u.user_id
    `;
    const params = [];

    if (role !== 'ADMIN') {
      sql += ' WHERE r.user_id = ?';
      params.push(userId || '5');
    }

    sql += ' ORDER BY r.redemption_id DESC';
    const redemptions = await query(sql, params);

    return NextResponse.json({ success: true, redemptions });
  } catch (error) {
    console.error('API redemptions GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
