import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đã đăng xuất.' });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
