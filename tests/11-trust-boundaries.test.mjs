import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedBase, call, as, balance, one, countOf, addView, addAd, dayOffset, db } from './helpers.mjs';

describe('Trust boundaries', () => {
  beforeEach(() => seedBase());

  it('does not authenticate a caller from a user ID header or query parameter', async () => {
    const response = await call('wallet', 'GET', {
      query: { userId: 5 },
      headers: { 'x-user-id': '5' }
    });

    assert.equal(response.status, 401);
  });

  it('allows a verified cookie session to read its own wallet', async () => {
    const response = await call('wallet', 'GET', { headers: as(5) });

    assert.equal(response.status, 200);
    assert.equal(response.body.balance, 1520);
  });

  it('labels the public ad feed as SANDBOX and rejects campaigns outside their run dates', async () => {
    const ads = await call('ads', 'GET');
    assert.equal(ads.status, 200);
    assert.equal(ads.body.verification_mode, 'SANDBOX');

    addAd({ ad_id: 80, start_date: dayOffset(1), end_date: dayOffset(2) });
    const start = await call('views/start', 'POST', {
      headers: as(5),
      body: { user_id: 5, ad_id: 80 }
    });

    assert.equal(start.status, 409);
  });

  it('never credits Xu for a timer-only ad completion', async () => {
    const initialBalance = balance(5);
    const start = await call('views/start', 'POST', {
      headers: as(5),
      body: { user_id: 5, ad_id: 1 }
    });

    assert.equal(start.status, 200, start.raw);
    assert.equal(start.body.verification_mode, 'SANDBOX');

    const result = await call('views/complete', 'POST', {
      headers: as(5),
      body: {
        user_id: 5,
        ad_id: 1,
        view_token: start.body.view_token,
        watched_seconds: 3600
      }
    });

    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'AD_VERIFICATION_NOT_CONFIGURED');
    assert.equal(balance(5), initialBalance);
    assert.equal(countOf('xu_transactions', "user_id = 5 AND txn_type = 'EARN'"), 0);
    assert.equal(one('SELECT view_status FROM ad_views WHERE view_token = ?', start.body.view_token).view_status, 'STARTED');
  });

  it('does not count a legacy completed view without provider proof toward ad tasks', async () => {
    const task = db.prepare(
      `INSERT INTO DailyTasks (TaskKey, Title, Description, RewardXu, TaskType, TargetCount, IsActive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('verified-view', 'Quảng cáo hợp lệ', 'Cần xác minh nhà cung cấp.', 10, 'VALID_AD_VIEWS', 1, 1);
    addView({ user_id: 5, ad_id: 1, view_status: 'COMPLETED', reward_xu: 10 });
    const initialBalance = balance(5);

    const result = await call('daily-tasks', 'GET', { headers: as(5) });
    const adTask = result.body.tasks.find((item) => item.TaskKey === 'verified-view');

    assert.equal(result.status, 200);
    assert.equal(adTask.progress, 0);
    assert.equal(adTask.completed, false);

    const claim = await call('daily-tasks/[id]/claim', 'POST', {
      headers: as(5),
      params: { id: Number(task.lastInsertRowid) }
    });

    assert.equal(claim.status, 409);
    assert.equal(balance(5), initialBalance);
  });

  it('does not issue or reveal OTP codes without a configured provider', async () => {
    const result = await call('auth/verify-otp', 'POST', {
      body: { action: 'request', email: 'viewer@example.test' }
    });

    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'OTP_PROVIDER_NOT_CONFIGURED');
    assert.equal(result.body.otp_code, undefined);
  });

  it('does not approve a redemption using an in-memory demo OTP', async () => {
    const result = await call('redemptions/confirm', 'POST', {
      headers: as(5),
      body: { redemption_id: 1, otp: '123456' }
    });

    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'OTP_PROVIDER_NOT_CONFIGURED');
  });
});
