import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const adId = params.id;
    const body = await request.json();
    const { status, reject_reason, reviewed_by } = body;

    const allowedStatuses = ['ACTIVE', 'PAUSED', 'REJECTED', 'ENDED'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái cập nhật không hợp lệ!' }, { status: 400 });
    }

    await query(
      `UPDATE ads 
       SET status = ?, 
           reject_reason = ?, 
           reviewed_by = ?
       WHERE ad_id = ?`,
      [status, reject_reason || null, reviewed_by || 1, adId]
    );

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái quảng cáo sang ${status} thành công!`
    });
  } catch (error) {
    console.error('API Ads status error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
