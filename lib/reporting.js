export const REPORT_PERIODS = ['week', 'month', 'all'];

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateKey(value) {
  if (value instanceof Date) return dateOnly(value);
  return String(value).slice(0, 10);
}

export function reportRange(period, now = new Date()) {
  if (period === 'all') return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'month') start.setDate(1);
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [dateOnly(start), dateOnly(end)];
}

export function parseReportPeriod(request) {
  const period = new URL(request.url).searchParams.get('period') || 'month';
  return REPORT_PERIODS.includes(period) ? period : null;
}

export function chartRange(period, now = new Date()) {
  const range = reportRange(period, now);
  if (range) return range;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return [dateOnly(start), dateOnly(end)];
}

export function summarizeViews(rows) {
  const days = new Map();
  for (const row of rows) {
    const date = dateKey(row.view_date);
    const summary = days.get(date) || { date, total: 0, valid: 0, invalid: 0 };
    summary.total++;
    if (row.view_status === 'COMPLETED') summary.valid++;
    if (row.view_status === 'INVALID') summary.invalid++;
    days.set(date, summary);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
