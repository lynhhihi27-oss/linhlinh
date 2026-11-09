import { query } from '@/lib/db';

export const LEADERBOARD_PERIODS = ['week', 'month', 'all'];

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function leaderboardRange(period, now = new Date()) {
  if (period === 'all') return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'month') start.setDate(1);
  if (period === 'week') {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  }
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (period === 'week' ? 7 : period === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() : 1));
  return [dateOnly(start), dateOnly(end)];
}

export async function loadLeaderboard(period, userId) {
  const range = leaderboardRange(period);
  const dateFilter = range ? 'AND t.created_at >= ? AND t.created_at < ?' : '';
  const params = range ? [range[0], range[1]] : [];
  const earnedUsers = await query(
    `SELECT u.user_id, u.full_name,
            COALESCE(SUM(CASE
              WHEN t.txn_type IN ('EARN', 'BONUS') AND t.amount > 0
                AND (t.view_id IS NULL OR EXISTS (
                  SELECT 1 FROM ad_views v WHERE v.view_id = t.view_id AND v.view_status = 'COMPLETED'
                ))
              THEN t.amount ELSE 0 END), 0) AS total_earned
     FROM users u
     LEFT JOIN xu_transactions t ON t.user_id = u.user_id ${dateFilter}
     WHERE u.system_role = 'VIEWER' AND u.account_status = 'ACTIVE'
     GROUP BY u.user_id, u.full_name
     ORDER BY total_earned DESC, u.user_id ASC`,
    params
  );
  const ranked = earnedUsers.map((user, index) => ({ ...user, rank: index + 1 }));
  const currentUser = ranked.find((user) => Number(user.user_id) === Number(userId));
  return {
    top: ranked.slice(0, 10),
    me: currentUser ? { rank: currentUser.rank, total_earned: currentUser.total_earned } : null
  };
}
