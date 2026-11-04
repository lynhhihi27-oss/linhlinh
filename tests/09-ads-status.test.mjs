import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCookie } from '../lib/auth.js';
import { seedBase, call, one } from './helpers.mjs';

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
