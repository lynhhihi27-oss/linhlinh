import { NextResponse } from 'next/server';
import { loadLeaderboard, LEADERBOARD_PERIODS } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    if (!LEADERBOARD_PERIODS.includes(period)) {
      return NextResponse.json({ success: false, message: 'Khoảng thời gian không hợp lệ.' }, { status: 400 });
    }
    const data = await loadLeaderboard(period, null);
    return NextResponse.json({ success: true, period, users: data.top });
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải bảng xếp hạng lúc này.' }, { status: 500 });
  }
}
