import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireSession(request, ['VIEWER']);
  if (auth.response) return auth.response;

  return NextResponse.json({
    success: false,
    verification_mode: 'SANDBOX',
    error: 'AD_VERIFICATION_NOT_CONFIGURED',
    message: 'Chưa tích hợp nhà cung cấp xác minh quảng cáo. Phiên xem thử không được cộng Xu.'
  }, { status: 503 });
}
