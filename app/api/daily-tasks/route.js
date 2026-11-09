import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    const auth = await requireSession(request, ['VIEWER']);
    if (auth.response) return auth.response;
    const date = today();
    const [tasks, views, claims] = await Promise.all([
      query(
        `SELECT TaskID, TaskKey, Title, Description, RewardXu, TaskType, TargetCount
         FROM DailyTasks WHERE IsActive = 1 ORDER BY TaskID`
      ),
      query(
        `SELECT COUNT(*) AS completed_views FROM ad_views
         WHERE user_id = ? AND view_date = ? AND view_status = 'COMPLETED'`,
        [auth.user.user_id, date]
      ),
      query(
        `SELECT TaskID, Progress, ClaimedAt FROM UserDailyTasks
         WHERE UserID = ? AND TaskDate = ?`,
        [auth.user.user_id, date]
      )
    ]);
    const claimedByTask = new Map(claims.map((claim) => [Number(claim.TaskID), claim]));
    const completedViews = Number(views[0]?.completed_views || 0);
    const result = tasks.map((task) => {
      const claim = claimedByTask.get(Number(task.TaskID));
      const progress = task.TaskType === 'VALID_AD_VIEWS'
        ? Math.min(completedViews, Number(task.TargetCount))
        : 1;
      return {
        ...task,
        progress,
        claimed: Boolean(claim),
        completed: progress >= Number(task.TargetCount),
        status: claim ? 'CLAIMED' : progress >= Number(task.TargetCount) ? 'CLAIMABLE' : 'IN_PROGRESS'
      };
    });
    return NextResponse.json({ success: true, date, tasks: result });
  } catch (error) {
    console.error('Daily tasks GET error:', error);
    return NextResponse.json({ success: false, message: 'Không thể tải nhiệm vụ lúc này.' }, { status: 500 });
  }
}
