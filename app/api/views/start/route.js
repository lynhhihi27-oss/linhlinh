import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireSession(request, ['VIEWER']);
  if (auth.response) return auth.response;

  return NextResponse.json({
    success: false,
    message: 'Chức năng nhận Xu đang tạm khóa vì hệ thống chưa xác minh được quảng cáo thực sự đã phát.'
  }, { status: 503 });
}
