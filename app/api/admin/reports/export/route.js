import { NextResponse } from 'next/server';
import { GET as getAdminReport } from '../../../reports/admin/route.js';

export const dynamic = 'force-dynamic';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request) {
  const reportResponse = await getAdminReport(request);
  if (!reportResponse.ok) return reportResponse;

  const report = await reportResponse.json();
  if (!report.success) {
    return NextResponse.json(report, { status: reportResponse.status });
  }

  const rows = [
    ['type', 'date_or_metric', 'value_1', 'value_2', 'value_3', 'value_4', 'value_5'],
    ['period', report.period, '', '', '', '', ''],
    ...Object.entries(report.stats).map(([metric, value]) => ['summary', metric, value, '', '', '', '']),
    ...report.chart.map((day) => [
      'daily',
      day.date,
      day.xu_issued,
      day.xu_redeemed,
      day.total_views,
      day.valid_views,
      day.invalid_views
    ])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const filename = `youtube-xu-admin-report-${report.period}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
