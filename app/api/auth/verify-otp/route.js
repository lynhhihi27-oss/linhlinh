import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'OTP_PROVIDER_NOT_CONFIGURED',
    message: 'Chưa cấu hình nhà cung cấp OTP. Hệ thống không tạo hoặc xác nhận mã OTP thử nghiệm.'
  }, { status: 503 });
}
