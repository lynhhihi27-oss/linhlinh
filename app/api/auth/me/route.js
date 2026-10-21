import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('API me error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
