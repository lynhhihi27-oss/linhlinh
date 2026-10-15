import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id') || '5'; // Mặc định User 5: Viewer Trần Văn Long

    if (userId === 'guest') {
      return NextResponse.json({
        success: true,
        user: {
          user_id: 0,
          full_name: 'Khách vãng lai',
          email: '',
          phone: '',
          system_role: 'GUEST',
          account_status: 'ACTIVE',
          xu_balance: 0
        }
      });
    }

    const users = await query(
      'SELECT user_id, email, phone, full_name, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('API me error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
