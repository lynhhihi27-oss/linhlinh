// TC-008 → TC-011: danh sách quảng cáo dành cho người xem.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedBase, call, addUser, addAd, addTargeting, addView, dayOffset, matchesTargeting, rows } from './helpers.mjs';

const YEAR = new Date().getFullYear();
const listFor = async (userId, extra = {}) =>
  (await call('ads', 'GET', { query: { role: 'VIEWER', userId, ...extra } })).body.ads;
const idsFor = async (userId, extra) => (await listFor(userId, extra)).map(a => a.ad_id).sort((a, b) => a - b);

describe('Danh sách quảng cáo cho người xem', () => {
  beforeEach(() => seedBase());

  it('TC-008 | chỉ hiện quảng cáo ACTIVE, còn ngân sách và đang trong thời gian chạy', async () => {
    addAd({ ad_id: 20, title: 'Hết ngân sách', budget_xu: 100, spent_xu: 100 });
    addAd({ ad_id: 21, title: 'Đã hết hạn', start_date: dayOffset(-30), end_date: dayOffset(-1) });
    addAd({ ad_id: 22, title: 'Chưa tới ngày chạy', start_date: dayOffset(2), end_date: dayOffset(10) });
    // seed: 1-3 ACTIVE; 4 PENDING; 5 ENDED; 6 REJECTED; 7 PAUSED
    assert.deepEqual(await idsFor(9), [1, 2, 3]);
  });

  it('TC-009 | lọc theo đối tượng mục tiêu: QC cho nữ 18–24 Hà Nội không hiện với nam 30 tuổi', async () => {
    const ad = addAd({ ad_id: 30, title: 'Chỉ cho nữ 18-24 Hà Nội' });
    addTargeting(ad, { gender: 'FEMALE', age_from: 18, age_to: 24, province: 'Hà Nội' });
    const male30 = addUser({ birth_year: YEAR - 30, gender: 'MALE', province: 'Hà Nội' });
    assert.ok(!(await idsFor(male30)).includes(ad),
      'Nam 30 tuổi vẫn thấy quảng cáo nhắm nữ 18–24: API GET /api/ads không hề dùng bảng ad_targeting');
  });

  it('TC-009 | người đúng đối tượng (nữ 20 tuổi Hà Nội) vẫn thấy quảng cáo đó', async () => {
    const ad = addAd({ ad_id: 30 });
    addTargeting(ad, { gender: 'FEMALE', age_from: 18, age_to: 24, province: 'Hà Nội' });
    const female20 = addUser({ birth_year: YEAR - 20, gender: 'FEMALE', province: 'Hà Nội' });
    assert.ok((await idsFor(female20)).includes(ad));
  });

  it('EXT-08 | ma trận đối tượng mục tiêu (giới tính × tuổi × tỉnh, kể cả giá trị biên)', async () => {
    const ad = addAd({ ad_id: 31 });
    addTargeting(ad, { gender: 'FEMALE', age_from: 18, age_to: 24, province: 'Hà Nội' });
    const rowsDef = [
      ['nữ 17 tuổi HN (dưới biên)', 17, 'FEMALE', 'Hà Nội'],
      ['nữ 18 tuổi HN (biên dưới)', 18, 'FEMALE', 'Hà Nội'],
      ['nữ 24 tuổi HN (biên trên)', 24, 'FEMALE', 'Hà Nội'],
      ['nữ 25 tuổi HN (trên biên)', 25, 'FEMALE', 'Hà Nội'],
      ['nam 20 tuổi HN (sai giới tính)', 20, 'MALE', 'Hà Nội'],
      ['nữ 20 tuổi TP.HCM (sai tỉnh)', 20, 'FEMALE', 'TP.HCM'],
      ['nữ 20 tuổi HN (đúng hết)', 20, 'FEMALE', 'Hà Nội'],
    ];
    const wrong = [];
    for (const [label, age, gender, province] of rowsDef) {
      const uid = addUser({ birth_year: YEAR - age, gender, province });
      const user = rows('SELECT * FROM users WHERE user_id = ?', uid)[0];
      const expected = matchesTargeting(user, rows('SELECT * FROM ad_targeting WHERE ad_id = ?', ad));
      const actual = (await idsFor(uid)).includes(ad);
      if (expected !== actual) wrong.push(`${label}: ${actual ? 'thấy' : 'không thấy'} (đúng ra phải ${expected ? 'thấy' : 'không thấy'})`);
    }
    assert.deepEqual(wrong, [], 'Sai đối tượng mục tiêu:\n  ' + wrong.join('\n  '));
  });

  it('EXT-09 | quảng cáo nhắm nhiều khu vực (HOẶC): thấy khi thuộc một trong các khu vực', async () => {
    const ad = addAd({ ad_id: 32 });
    addTargeting(ad, { province: 'Hà Nội' });
    addTargeting(ad, { province: 'TP.HCM' });
    const hcm = addUser({ province: 'TP.HCM' });
    assert.ok((await idsFor(hcm)).includes(ad));
  });

  it('TC-010 | lọc theo danh mục: chỉ hiện quảng cáo của danh mục được chọn', async () => {
    const r = await listFor(9, { category: 2 });
    assert.ok(r.length > 0);
    assert.ok(r.every(a => a.category_id === 2), 'có quảng cáo thuộc danh mục khác');
    assert.deepEqual(r.map(a => a.ad_id), [3]);
  });

  it('TC-011 | quảng cáo đã xem hôm nay được đánh dấu để khóa nút xem', async () => {
    addView({ user_id: 5, ad_id: 1 });
    addView({ user_id: 5, ad_id: 2, view_date: dayOffset(-1) });   // xem hôm qua: không tính
    const list = await listFor(5);
    const byId = Object.fromEntries(list.map(a => [a.ad_id, a]));
    assert.ok(byId[1].viewed_today >= 1, 'QC đã xem hôm nay phải có viewed_today >= 1');
    assert.equal(byId[2].viewed_today, 0, 'xem hôm qua không được tính là đã xem hôm nay');
    assert.equal(byId[3].viewed_today, 0);
  });

  it('TC-011 | lượt xem chưa hoàn tất (STARTED/INVALID) không làm quảng cáo bị khóa', async () => {
    addView({ user_id: 5, ad_id: 1, view_status: 'INVALID', reward_xu: 0 });
    const list = await listFor(5);
    assert.equal(list.find(a => a.ad_id === 1).viewed_today, 0);
  });
});
