import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { loadLeaderboard, LEADERBOARD_PERIODS } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;
    const period = new URL(request.url).searchParams.get('period') || 'all';
    if (!LEADERBOARD_PERIODS.includes(period)) {
      return NextResponse.json({ success: false, message: 'Khoảng thời gian không hợp lệ.' }, { status: 400 });
    }
    const data = await loadLeaderboard(period, auth.user.user_id);
    return NextResponse.json({ success: true, period, me: data.me });
  } catch (error) {
    console.error('Leaderboard me GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải thứ hạng của bạn lúc này.' }, { status: 500 });
  }
}
