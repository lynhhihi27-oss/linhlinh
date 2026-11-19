import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireSession(request, ['VIEWER']);
  if (auth.response) return auth.response;

  return NextResponse.json({
    success: false,
    error: 'OTP_PROVIDER_NOT_CONFIGURED',
    message: 'Chưa cấu hình nhà cung cấp OTP. Đơn đổi quà không được xác nhận bằng mã thử nghiệm.'
  }, { status: 503 });
}
