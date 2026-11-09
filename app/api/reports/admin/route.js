import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { chartRange, dateKey, parseReportPeriod, reportRange } from '@/lib/reporting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['ADMIN']);
    if (auth.response) return auth.response;
    const period = parseReportPeriod(request);
    if (!period) {
      return NextResponse.json({ success: false, message: 'Khoảng thời gian không hợp lệ.' }, { status: 400 });
    }

    const range = reportRange(period);
    const chart = chartRange(period);
    const timeFilter = range ? ' AND created_at >= ? AND created_at < ?' : '';
    const viewTimeFilter = range ? ' AND view_date >= ? AND view_date < ?' : '';
    const params = range || [];
    const [users, transactions, views, redemptions, tickets, ads, chartTransactions, chartViews] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total_users,
                SUM(CASE WHEN system_role = 'ADVERTISER' THEN 1 ELSE 0 END) AS total_advertisers
         FROM users`
      ),
      query(
        `SELECT COUNT(*) AS total_transactions,
                COALESCE(SUM(CASE WHEN txn_type IN ('EARN', 'BONUS') AND amount > 0
                  AND (view_id IS NULL OR EXISTS (
                    SELECT 1 FROM ad_views v WHERE v.view_id = xu_transactions.view_id AND v.view_status = 'COMPLETED'
                  )) THEN amount ELSE 0 END), 0) AS xu_issued,
                COALESCE(SUM(CASE WHEN txn_type = 'REDEEM' AND amount < 0 THEN -amount ELSE 0 END), 0) AS xu_redeemed
         FROM xu_transactions WHERE 1 = 1${timeFilter}`,
        params
      ),
      query(
        `SELECT COUNT(*) AS total_views,
                COALESCE(SUM(CASE WHEN view_status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS valid_views,
                COALESCE(SUM(CASE WHEN view_status = 'INVALID' THEN 1 ELSE 0 END), 0) AS invalid_views
         FROM ad_views WHERE 1 = 1${viewTimeFilter}`,
        params
      ),
      query(
        `SELECT COUNT(*) AS total_redemptions
         FROM redemptions WHERE 1 = 1${timeFilter.replaceAll('created_at', 'requested_at')}`,
        params
      ),
      query(
        `SELECT COUNT(*) AS pending_tickets FROM SupportTickets
         WHERE Status = 'PENDING'${range ? ' AND CreatedAt >= ? AND CreatedAt < ?' : ''}`,
        params
      ),
      query(
        `SELECT COALESCE(SUM(spent_xu), 0) AS campaign_spend FROM ads`
      ),
      query(
        `SELECT t.created_at, t.txn_type, t.amount, t.view_id, v.view_status AS referenced_view_status
         FROM xu_transactions t LEFT JOIN ad_views v ON v.view_id = t.view_id
         WHERE t.created_at >= ? AND t.created_at < ?`,
        chart
      ),
      query(
        `SELECT view_date, view_status FROM ad_views
         WHERE view_date >= ? AND view_date < ?`,
        chart
      )
    ]);

    const daily = new Map();
    const add = (date, key, amount) => {
      const day = dateKey(date);
      const row = daily.get(day) || { date: day, xu_issued: 0, xu_redeemed: 0, total_views: 0, valid_views: 0, invalid_views: 0 };
      row[key] += Number(amount);
      daily.set(day, row);
    };
    for (const transaction of chartTransactions) {
      const validView = transaction.view_id === null || transaction.view_id === undefined ||
        transaction.referenced_view_status === 'COMPLETED';
      if (validView && ['EARN', 'BONUS'].includes(transaction.txn_type) && Number(transaction.amount) > 0) {
        add(transaction.created_at, 'xu_issued', Number(transaction.amount));
      }
      if (transaction.txn_type === 'REDEEM' && Number(transaction.amount) < 0) {
        add(transaction.created_at, 'xu_redeemed', Math.abs(Number(transaction.amount)));
      }
    }
    for (const view of chartViews) {
      add(view.view_date, 'total_views', 1);
      if (view.view_status === 'COMPLETED') add(view.view_date, 'valid_views', 1);
      if (view.view_status === 'INVALID') add(view.view_date, 'invalid_views', 1);
    }

    return NextResponse.json({
      success: true,
      period,
      stats: {
        total_users: users[0]?.total_users || 0,
        total_advertisers: users[0]?.total_advertisers || 0,
        xu_issued: transactions[0]?.xu_issued || 0,
        xu_redeemed: transactions[0]?.xu_redeemed || 0,
        campaign_spend: ads[0]?.campaign_spend || 0,
        total_transactions: transactions[0]?.total_transactions || 0,
        total_views: views[0]?.total_views || 0,
        valid_views: views[0]?.valid_views || 0,
        invalid_views: views[0]?.invalid_views || 0,
        total_redemptions: redemptions[0]?.total_redemptions || 0,
        pending_tickets: tickets[0]?.pending_tickets || 0
      },
      chart: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error) {
    console.error('Admin reports GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải báo cáo quản trị lúc này.' }, { status: 500 });
  }
}
