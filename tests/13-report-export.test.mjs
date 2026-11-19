import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { call, seedBase, as } from './helpers.mjs';

describe('Admin report CSV export', () => {
  beforeEach(() => seedBase());

  it('requires an administrator session', async () => {
    assert.equal((await call('admin/reports/export', 'GET')).status, 401);
    assert.equal((await call('admin/reports/export', 'GET', { headers: as(5) })).status, 403);
  });

  it('exports the same period summary and chart data as the admin report API', async () => {
    const response = await call('admin/reports/export', 'GET', {
      query: { period: 'month' },
      headers: as(1)
    });
    assert.equal(response.status, 200, response.raw);
    assert.match(response.raw, /^"type","date_or_metric"/);
    assert.match(response.raw, /"summary","total_users",/);
    assert.match(response.raw, /"summary","reserved_campaign_budget",/);
    assert.match(response.raw, /"period","month"/);
  });
});
