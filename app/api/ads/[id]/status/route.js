import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
  let connection;
  try {
    const auth = await requireSession(request, ['ADMIN', 'ADVERTISER']);
    if (auth.response) return auth.response;

    const adId = Number(params.id);
    if (!Number.isSafeInteger(adId) || adId <= 0) {
      return NextResponse.json({ success: false, message: 'Mã chiến dịch không hợp lệ.' }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Dữ liệu cập nhật không hợp lệ.' }, { status: 400 });
    }
    const { status, reject_reason } = body;

    const allowedStatuses = ['ACTIVE', 'PAUSED', 'REJECTED', 'ENDED'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái cập nhật không hợp lệ!' }, { status: 400 });
    }

    const rejectReason = typeof reject_reason === 'string' ? reject_reason.trim() : '';
    if (status === 'REJECTED' && (!rejectReason || rejectReason.length > 500)) {
      return NextResponse.json({ success: false, message: 'Khi từ chối, cần nhập lý do tối đa 500 ký tự.' }, { status: 400 });
    }
    if (reject_reason !== undefined && reject_reason !== null && typeof reject_reason !== 'string') {
      return NextResponse.json({ success: false, message: 'Lý do từ chối không hợp lệ.' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ads] = await connection.execute(
      'SELECT ad_id, advertiser_id, status, reserved_xu FROM ads WHERE ad_id = ? FOR UPDATE',
      [adId]
    );
    if (ads.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Không tìm thấy chiến dịch.' }, { status: 404 });
    }

    const ad = ads[0];
    const isAdmin = auth.user.system_role === 'ADMIN';
    if (!isAdmin && Number(ad.advertiser_id) !== Number(auth.user.user_id)) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Bạn không có quyền cập nhật chiến dịch này.' }, { status: 403 });
    }
    if (!isAdmin && !['ACTIVE', 'PAUSED', 'ENDED'].includes(status)) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: 'Nhà quảng cáo không có quyền duyệt hoặc từ chối chiến dịch.' }, { status: 403 });
    }

    const adminTransitions = {
      PENDING: ['ACTIVE', 'REJECTED'],
      ACTIVE: ['PAUSED', 'ENDED'],
      PAUSED: ['ACTIVE', 'ENDED']
    };
    const advertiserTransitions = {
      ACTIVE: ['PAUSED', 'ENDED'],
      PAUSED: ['ACTIVE', 'ENDED']
    };
    const transitions = isAdmin ? adminTransitions : advertiserTransitions;
    if (!transitions[ad.status]?.includes(status)) {
      await connection.rollback();
      return NextResponse.json({
        success: false,
        message: `Không thể chuyển chiến dịch từ ${ad.status} sang ${status}.`
      }, { status: 409 });
    }

    let refundedBudget = 0;
    if (['REJECTED', 'ENDED'].includes(status)) {
      refundedBudget = Number(ad.reserved_xu || 0);
      if (refundedBudget > 0) {
        const [advertisers] = await connection.execute(
          'SELECT xu_balance FROM users WHERE user_id = ? FOR UPDATE',
          [ad.advertiser_id]
        );
        if (advertisers.length === 0) {
          await connection.rollback();
          return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản nhà quảng cáo.' }, { status: 404 });
        }
        const balanceAfterRefund = Number(advertisers[0].xu_balance) + refundedBudget;
        await connection.execute('UPDATE users SET xu_balance = ? WHERE user_id = ?', [balanceAfterRefund, ad.advertiser_id]);
        await connection.execute(
          `INSERT INTO xu_transactions (user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at)
           VALUES (?, NULL, NULL, 'ADJUST', ?, ?, ?, NOW())`,
          [ad.advertiser_id, refundedBudget, balanceAfterRefund, `Hoàn ngân sách chiến dịch #${adId} (${status})`]
        );
      }
      await connection.execute('UPDATE ads SET reserved_xu = 0 WHERE ad_id = ?', [adId]);
    }

    await connection.execute(
      `UPDATE ads
       SET status = ?,
           reject_reason = ?,
           reviewed_by = CASE WHEN ? = 1 AND ? = 'PENDING' THEN ? ELSE reviewed_by END
       WHERE ad_id = ?`,
      [status, status === 'REJECTED' ? rejectReason : null, isAdmin ? 1 : 0, ad.status, auth.user.user_id, adId]
    );
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái quảng cáo sang ${status} thành công!`,
      refunded_budget_xu: refundedBudget
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('API Ads status error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật chiến dịch lúc này.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
