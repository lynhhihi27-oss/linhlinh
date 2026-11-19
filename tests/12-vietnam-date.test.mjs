import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vietnamDateKey } from '../lib/dates.js';
import { chartRange, reportRange } from '../lib/reporting.js';

describe('Vietnam business dates', () => {
  it('switches the business date at midnight in Ho Chi Minh City', () => {
    assert.equal(vietnamDateKey(new Date('2026-11-18T16:59:59.999Z')), '2026-11-18');
    assert.equal(vietnamDateKey(new Date('2026-11-18T17:00:00.000Z')), '2026-11-19');
  });

  it('builds weekly and monthly report ranges from the Vietnam date', () => {
    const now = new Date('2026-11-18T17:00:00.000Z');
    assert.deepEqual(reportRange('week', now), ['2026-11-16', '2026-11-20']);
    assert.deepEqual(reportRange('month', now), ['2026-11-01', '2026-11-20']);
    assert.deepEqual(chartRange('all', now), ['2026-10-21', '2026-11-20']);
  });
});
