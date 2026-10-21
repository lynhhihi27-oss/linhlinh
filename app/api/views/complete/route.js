import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireSession(request, ['VIEWER']);
  if (auth.response) return auth.response;

  return NextResponse.json({
    success: false,
    message: 'Chưa thể cộng Xu: ứng dụng chưa tích hợp dịch vụ xác minh lượt phát quảng cáo.'
  }, { status: 503 });
}
