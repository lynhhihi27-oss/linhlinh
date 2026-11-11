import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCookie } from '../lib/auth.js';
import { seedBase, call, one, addTxn, countOf, dayOffset, injectFault } from './helpers.mjs';

process.env.AUTH_SECRET = 'issue-7-test-secret-with-at-least-32-characters';

const auth = userId => ({
  cookie: createSessionCookie(userId).split(';')[0]
});

const updateStatus = (userId, adId, body) => call('ads/[id]/status', 'PATCH', {
  params: { id: adId },
  body,
  headers: auth(userId)
});

describe('Campaign status permissions and transitions', () => {
  beforeEach(() => seedBase());

  it('lets an advertiser pause and resume only their own active campaigns', async () => {
    const paused = await updateStatus(2, 1, { status: 'PAUSED' });
    assert.equal(paused.status, 200, paused.raw);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 1').status, 'PAUSED');

    const resumed = await updateStatus(2, 1, { status: 'ACTIVE' });
    assert.equal(resumed.status, 200, resumed.raw);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 1').status, 'ACTIVE');
  });

  it('denies advertisers access to another advertiser campaign', async () => {
    const response = await updateStatus(2, 3, { status: 'PAUSED' });
    assert.equal(response.status, 403);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 3').status, 'ACTIVE');
  });

  it('does not let advertisers approve a pending campaign', async () => {
    const response = await updateStatus(2, 4, { status: 'ACTIVE' });
    assert.equal(response.status, 409);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 4').status, 'PENDING');
  });

  it('lets an admin approve a pending campaign and records the reviewer', async () => {
    const response = await updateStatus(1, 4, { status: 'ACTIVE' });
    assert.equal(response.status, 200, response.raw);
    const ad = one('SELECT status, reviewed_by FROM ads WHERE ad_id = 4');
    assert.deepEqual(ad, { status: 'ACTIVE', reviewed_by: 1 });
  });

  it('requires a rejection reason and rejects invalid state transitions', async () => {
    const missingReason = await updateStatus(1, 4, { status: 'REJECTED' });
    assert.equal(missingReason.status, 400);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 4').status, 'PENDING');

    const invalidTransition = await updateStatus(1, 6, { status: 'ACTIVE' });
    assert.equal(invalidTransition.status, 409);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 6').status, 'REJECTED');
  });
});

describe('Wallet transaction pagination', () => {
  beforeEach(() => {
    seedBase();
    for (let index = 1; index <= 30; index++) {
      addTxn(5, index % 2 === 0 ? 'EARN' : 'REDEEM', index % 2 === 0 ? 2 : -1, 1500 + index);
    }
  });

  it('returns non-overlapping cursor pages and filters transactions by type', async () => {
    const first = await call('wallet', 'GET', {
      query: { limit: '10' },
      headers: auth(5)
    });
    assert.equal(first.status, 200, first.raw);
    assert.equal(first.body.transactions.length, 10);
    assert.equal(first.body.has_more, true);

    const second = await call('wallet', 'GET', {
      query: { limit: '10', before: first.body.next_cursor },
      headers: auth(5)
    });
    assert.equal(second.status, 200, second.raw);
    assert.equal(second.body.transactions.length, 10);
    const firstIds = new Set(first.body.transactions.map(transaction => transaction.txn_id));
    assert.ok(second.body.transactions.every(transaction => !firstIds.has(transaction.txn_id)));

    const earned = await call('wallet', 'GET', {
      query: { limit: '100', type: 'EARN' },
      headers: auth(5)
    });
    assert.equal(earned.status, 200, earned.raw);
    assert.equal(earned.body.transactions.length, 15);
    assert.ok(earned.body.transactions.every(transaction => transaction.txn_type === 'EARN'));
  });

  it('rejects invalid limits, cursors, and transaction types', async () => {
    for (const query of [
      { limit: '0' },
      { limit: '101' },
      { before: 'not-an-id' },
      { type: 'UNKNOWN' }
    ]) {
      const response = await call('wallet', 'GET', { query, headers: auth(5) });
      assert.equal(response.status, 400, `${JSON.stringify(query)} returned ${response.status}`);
    }
  });
});

describe('Campaign creation transaction', () => {
  beforeEach(() => seedBase());

  const campaign = title => ({
    title,
    video_url: 'https://www.youtube.com/watch?v=abc123xyz00',
    category_id: 1,
    duration_sec: 30,
    reward_xu: 10,
    budget_xu: 5000,
    start_date: dayOffset(1),
    end_date: dayOffset(30),
    target_gender: 'FEMALE'
  });

  it('creates the campaign and targeting record in one transaction', async () => {
    const response = await call('ads', 'POST', {
      body: campaign('Atomic campaign'),
      headers: auth(2)
    });
    assert.equal(response.status, 200, response.raw);
    assert.equal(countOf('ads', 'title = ?', 'Atomic campaign'), 1);
    assert.equal(countOf('ad_targeting', 'ad_id = ?', response.body.ad_id), 1);
  });

  it('rolls back the campaign if inserting its targeting record fails', async () => {
    injectFault(/INSERT INTO ad_targeting/i);
    const response = await call('ads', 'POST', {
      body: campaign('Rolled back campaign'),
      headers: auth(2)
    });
    assert.equal(response.status, 500);
    assert.equal(countOf('ads', 'title = ?', 'Rolled back campaign'), 0);
    assert.equal(countOf('ad_targeting', '1 = 1'), 0);
  });
});

describe('Personal profile updates', () => {
  beforeEach(() => seedBase());

  it('updates only the authenticated user profile', async () => {
    const response = await call('profile', 'PATCH', {
      body: {
        full_name: 'Viewer Updated',
        phone: '0912345678',
        gender: 'FEMALE',
        province: 'Đà Nẵng'
      },
      headers: auth(5)
    });
    assert.equal(response.status, 200, response.raw);
    assert.equal(response.body.user.full_name, 'Viewer Updated');
    assert.equal(response.body.user.phone, '0912345678');
    assert.equal(response.body.user.gender, 'FEMALE');
    assert.equal(response.body.user.province, 'Đà Nẵng');
    assert.equal('password_hash' in response.body.user, false);
    assert.equal(one('SELECT full_name FROM users WHERE user_id = 6').full_name, 'Lê Thị Nhi');
  });

  it('rejects duplicate phone numbers and protected fields', async () => {
    const duplicatePhone = await call('profile', 'PATCH', {
      body: { phone: '0900000006' },
      headers: auth(5)
    });
    assert.equal(duplicatePhone.status, 409);

    const protectedField = await call('profile', 'PATCH', {
      body: { xu_balance: 999999 },
      headers: auth(5)
    });
    assert.equal(protectedField.status, 400);
    assert.equal(one('SELECT xu_balance FROM users WHERE user_id = 5').xu_balance, 1520);
  });

  it('requires an authenticated session', async () => {
    const response = await call('profile', 'PATCH', { body: { full_name: 'Unauthenticated' } });
    assert.equal(response.status, 401);
    assert.equal(one('SELECT full_name FROM users WHERE user_id = 5').full_name, 'Trần Văn Long');
  });
});
