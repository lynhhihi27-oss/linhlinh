import { vietnamDateKey } from './dates.js';

export const REPORT_PERIODS = ['week', 'month', 'all'];

function dateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateKey(value) {
  if (value instanceof Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const date = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
    return `${date.year}-${date.month}-${date.day}`;
  }
  return String(value).slice(0, 10);
}

export function reportRange(period, now = new Date()) {
  if (period === 'all') return null;
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (period === 'month') start.setUTCDate(1);
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  }
  const end = new Date(Date.UTC(year, month - 1, day + 1));
  return [dateOnly(start), dateOnly(end)];
}

export function parseReportPeriod(request) {
  const period = new URL(request.url).searchParams.get('period') || 'month';
  return REPORT_PERIODS.includes(period) ? period : null;
}

export function chartRange(period, now = new Date()) {
  const range = reportRange(period, now);
  if (range) return range;
  const [year, month, day] = vietnamDateKey(now).split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return [dateOnly(start), dateOnly(end)];
}

export function summarizeViews(rows) {
  const days = new Map();
  for (const row of rows) {
    const date = dateKey(row.view_date);
    const summary = days.get(date) || { date, total: 0, valid: 0, invalid: 0 };
    summary.total++;
    if (row.view_status === 'COMPLETED' && row.verified_at) summary.valid++;
    if (row.view_status === 'INVALID') summary.invalid++;
    days.set(date, summary);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
