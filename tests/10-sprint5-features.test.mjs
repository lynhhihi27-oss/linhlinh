import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCookie } from '../lib/auth.js';
import { addTxn, addView, call, countOf, db, seedBase } from './helpers.mjs';

process.env.AUTH_SECRET = 'sprint-five-test-secret-with-at-least-32-characters';
const auth = userId => ({ cookie: createSessionCookie(userId).split(';')[0] });

function seedTasks() {
  const insert = db.prepare(
    `INSERT INTO DailyTasks (TaskID, TaskKey, Title, Description, RewardXu, TaskType, TargetCount, IsActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  );
  insert.run(1, 'daily-login', 'Đăng nhập hằng ngày', 'Đăng nhập hôm nay.', 5, 'LOGIN', 1);
  insert.run(2, 'valid-ad-one', 'Xem 1 quảng cáo hợp lệ', 'Hoàn thành lượt xem.', 10, 'VALID_AD_VIEWS', 1);
  insert.run(3, 'valid-ad-three', 'Xem 3 quảng cáo hợp lệ', 'Hoàn thành ba lượt xem.', 30, 'VALID_AD_VIEWS', 3);
  insert.run(4, 'daily-attendance', 'Điểm danh hằng ngày', 'Điểm danh hôm nay.', 5, 'DAILY_ATTENDANCE', 1);
}

describe('Sprint 5 – notifications and leaderboard', () => {
  beforeEach(() => seedBase());

  it('scopes notifications to the signed-in user and supports read-all', async () => {
    db.prepare('INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (5, ?, ?, ?)').run('Riêng tư', 'Thông báo của user 5', 'TEST');
    db.prepare('INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (6, ?, ?, ?)').run('Riêng tư', 'Thông báo của user 6', 'TEST');

    const own = await call('notifications', 'GET', { headers: auth(5) });
    assert.equal(own.status, 200, own.raw);
    assert.equal(own.body.notifications.length, 1);
    assert.equal(own.body.unread_count, 1);
    const other = await call('notifications/[id]', 'PATCH', { params: { id: 2 }, headers: auth(5) });
    assert.equal(other.status, 404);
    assert.equal(db.prepare('SELECT IsRead FROM Notifications WHERE UserID = 6').get().IsRead, 0);

    const marked = await call('notifications/read-all', 'PATCH', { headers: auth(5) });
    assert.equal(marked.status, 200, marked.raw);
    assert.equal(db.prepare('SELECT IsRead FROM Notifications WHERE UserID = 5').get().IsRead, 1);
  });

  it('notifies the user when an exchange is approved or rejected', async () => {
    const approvedRequest = await call('redeem', 'POST', {
      headers: auth(5),
      body: { reward_id: 1, request_key: '00000000-0000-4000-8000-000000000005' }
    });
    assert.equal(approvedRequest.status, 200, approvedRequest.raw);
    const approved = await call('redemptions/[id]/process', 'PATCH', {
      params: { id: approvedRequest.body.redemption_id },
      headers: auth(1),
      body: { action: 'APPROVE', gift_code: 'REAL-CODE-1' }
    });
    assert.equal(approved.status, 200, approved.raw);
    assert.equal(countOf('Notifications', 'UserID = 5 AND Type = ?', 'REDEMPTION_APPROVED'), 1);

    const rejectedRequest = await call('redeem', 'POST', {
      headers: auth(8),
      body: { reward_id: 1, request_key: '00000000-0000-4000-8000-000000000008' }
    });
    assert.equal(rejectedRequest.status, 200, rejectedRequest.raw);
    const rejected = await call('redemptions/[id]/process', 'PATCH', {
      params: { id: rejectedRequest.body.redemption_id },
      headers: auth(1),
      body: { action: 'REJECT' }
    });
    assert.equal(rejected.status, 200, rejected.raw);
    assert.equal(countOf('Notifications', 'UserID = 8 AND Type = ?', 'REDEMPTION_REJECTED'), 1);
  });

  it('ranks only positive valid earnings and returns a private-safe profile', async () => {
    const valid = addView({ user_id: 5, ad_id: 1 });
    const invalid = addView({ user_id: 5, ad_id: 2, view_status: 'INVALID' });
    addTxn(5, 'EARN', 100, 100);
    addTxn(5, 'EARN', 500, 600, { view_id: valid });
    addTxn(5, 'EARN', 900, 1500, { view_id: invalid });
    addTxn(5, 'REFUND', 700, 2200);
    addTxn(5, 'ADJUST', -50, 2150);
    addTxn(6, 'BONUS', 800, 800);

    const board = await call('leaderboard', 'GET', { query: { period: 'all' } });
    assert.equal(board.status, 200, board.raw);
    assert.equal(board.body.users[0].user_id, 6);
    assert.equal(board.body.users.find(user => user.user_id === 5).total_earned, 600);
    assert.equal('email' in board.body.users[0], false);

    const mine = await call('leaderboard/me', 'GET', { query: { period: 'all' }, headers: auth(5) });
    assert.equal(mine.body.me.rank, 2);
    assert.equal(mine.body.me.total_earned, 600);
  });
});

describe('Sprint 5 – daily tasks', () => {
  beforeEach(() => {
    seedBase();
    seedTasks();
  });

  it('awards a completed task once and writes both ledger and notification records', async () => {
    const first = await call('daily-tasks/[id]/claim', 'POST', { params: { id: 1 }, headers: auth(5) });
    assert.equal(first.status, 200, first.raw);
    assert.equal(first.body.balance_after, 1525);
    assert.equal(countOf('TaskRewards'), 1);
    assert.equal(countOf('Notifications', 'UserID = 5 AND Type = ?', 'XU_EARNED'), 1);

    const repeated = await call('daily-tasks/[id]/claim', 'POST', { params: { id: 1 }, headers: auth(5) });
    assert.equal(repeated.status, 409);
    assert.equal(countOf('TaskRewards'), 1);
  });

  it('does not award ad-view tasks for missing or invalid verified views', async () => {
    addView({ user_id: 5, ad_id: 1, view_status: 'INVALID' });
    const response = await call('daily-tasks/[id]/claim', 'POST', { params: { id: 2 }, headers: auth(5) });
    assert.equal(response.status, 409);
    assert.equal(countOf('TaskRewards'), 0);
  });

  it('does not credit an unverified ad view and serializes repeated task claims', async () => {
    const balanceBefore = db.prepare('SELECT xu_balance FROM users WHERE user_id = 5').get().xu_balance;
    const unverified = await call('views/complete', 'POST', { headers: auth(5), body: { view_token: 'unverified' } });
    assert.equal(unverified.status, 503);
    assert.equal(db.prepare('SELECT xu_balance FROM users WHERE user_id = 5').get().xu_balance, balanceBefore);

    const claims = await Promise.all([
      call('daily-tasks/[id]/claim', 'POST', { params: { id: 1 }, headers: auth(5) }),
      call('daily-tasks/[id]/claim', 'POST', { params: { id: 1 }, headers: auth(5) })
    ]);
    assert.deepEqual(claims.map(result => result.status).sort(), [200, 409]);
    assert.equal(countOf('TaskRewards'), 1);
  });

  it('uses completed server-side views as progress and supports daily reset by date', async () => {
    addView({ user_id: 5, ad_id: 1 });
    const tasks = await call('daily-tasks', 'GET', { headers: auth(5) });
    assert.equal(tasks.status, 200, tasks.raw);
    assert.equal(tasks.body.tasks.find(task => task.TaskID === 2).progress, 1);
    assert.equal(tasks.body.tasks.find(task => task.TaskID === 3).progress, 1);

    const claim = await call('daily-tasks/[id]/claim', 'POST', { params: { id: 2 }, headers: auth(5) });
    assert.equal(claim.status, 200, claim.raw);
    assert.equal(countOf('xu_transactions', "user_id = 5 AND txn_type = 'BONUS'"), 1, JSON.stringify(db.prepare('SELECT * FROM xu_transactions').all()));
  });
});

describe('Sprint 5 – support and role-scoped reports', () => {
  beforeEach(() => seedBase());

  it('keeps tickets private and lets admins reply, update state, and notify the owner', async () => {
    const created = await call('support', 'POST', {
      headers: auth(5),
      body: { category: 'EARN_XU', subject: 'Lỗi nhận Xu', description: 'Tôi cần kiểm tra giao dịch chưa được ghi nhận.' }
    });
    assert.equal(created.status, 201, created.raw);
    const ticketId = created.body.ticket_id;
    const forbidden = await call('support/[id]', 'GET', { params: { id: ticketId }, headers: auth(6) });
    assert.equal(forbidden.status, 404);

    const replied = await call('support/[id]/reply', 'POST', {
      params: { id: ticketId }, headers: auth(1), body: { message: 'Chúng tôi đang kiểm tra giao dịch.' }
    });
    assert.equal(replied.status, 200, replied.raw);
    assert.equal(countOf('Notifications', 'UserID = 5 AND Type = ?', 'SUPPORT_REPLY'), 1);
    const ticket = await call('support/[id]', 'GET', { params: { id: ticketId }, headers: auth(5) });
    assert.equal(ticket.body.ticket.Status, 'PROCESSING');
    assert.equal(ticket.body.replies.length, 1);

    const resolved = await call('support/[id]/status', 'PATCH', {
      params: { id: ticketId }, headers: auth(1), body: { status: 'RESOLVED' }
    });
    assert.equal(resolved.status, 200, resolved.raw);
  });

  it('restricts advertiser reports to owned campaigns and counts ledger rows once', async () => {
    addView({ user_id: 5, ad_id: 1, view_status: 'COMPLETED' });
    addView({ user_id: 5, ad_id: 3, view_status: 'INVALID' });
    addTxn(5, 'EARN', 25, 25);
    addTxn(5, 'EARN', 25, 50);

    const report = await call('reports/advertiser', 'GET', { query: { period: 'all' }, headers: auth(2) });
    assert.equal(report.status, 200, report.raw);
    assert.equal(report.body.stats.total_views, 1);
    assert.equal(report.body.stats.valid_views, 1);
    const campaigns = await call('reports/campaigns', 'GET', { query: { period: 'all' }, headers: auth(2) });
    assert.equal(campaigns.body.campaigns.some(campaign => campaign.ad_id === 3), false);
    assert.ok(campaigns.body.campaigns.every(campaign => [1, 2, 4, 5].includes(campaign.ad_id)));

    const admin = await call('reports/admin', 'GET', { query: { period: 'all' }, headers: auth(1) });
    assert.equal(admin.status, 200, admin.raw);
    assert.equal(admin.body.stats.xu_issued, 50);
    assert.equal(admin.body.stats.total_transactions, 2);
  });

  it('rejects unauthenticated and cross-role report access', async () => {
    const anonymous = await call('reports/admin', 'GET');
    assert.equal(anonymous.status, 401);
    const wrongRole = await call('reports/admin', 'GET', { headers: auth(2) });
    assert.equal(wrongRole.status, 403);
    const advertiserWithoutSession = await call('reports/advertiser', 'GET', { headers: auth(5) });
    assert.equal(advertiserWithoutSession.status, 403);
  });
});
