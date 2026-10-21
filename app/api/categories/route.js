import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const categories = await query('SELECT category_id, category_name FROM ad_categories ORDER BY category_id ASC');
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải danh mục lúc này.' }, { status: 500 });
  }
}
