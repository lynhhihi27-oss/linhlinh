// Kiểm tra hạ tầng test hoạt động trước khi chạy các test nghiệp vụ.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedBase, call, rows, one, routeExists, start, watchFully, balance } from './helpers.mjs';

describe('SMOKE | Hạ tầng test', () => {
  beforeEach(() => seedBase());

  it('SMOKE-01 | nạp được dữ liệu mẫu và gọi được route handler thật', async () => {
    assert.equal(rows('SELECT * FROM users').length, 9);
    const r = await call('categories', 'GET');
    assert.equal(r.status, 200);
    assert.equal(r.body.categories.length, 3);
  });

  it('SMOKE-02 | gọi được route động có tham số [id]', async () => {
    assert.ok(routeExists('ads/[id]/status'));
    const r = await call('ads/[id]/status', 'PATCH', { params: { id: 4 }, body: { status: 'ACTIVE', reviewed_by: 1 } });
    assert.equal(r.status, 200);
    assert.equal(one('SELECT status FROM ads WHERE ad_id = 4').status, 'ACTIVE');
  });

  it('SMOKE-03 | luồng xem quảng cáo đầy đủ chạy được (start -> complete)', async () => {
    const before = balance(9);
    const { start: s, complete: c } = await watchFully(9, 1);
    assert.equal(s.status, 200, s.raw);
    assert.equal(c.status, 200, c.raw);
    assert.equal(balance(9), before + 10);
  });

  it('SMOKE-04 | không có transaction nào bị bỏ treo', async () => {
    await watchFully(9, 2);
    const { stats } = await import('./helpers.mjs');
    assert.equal(stats.leaked, 0);
  });
});
