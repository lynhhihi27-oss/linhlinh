// Tính toàn vẹn dữ liệu: đối soát sổ cái xu (TEST-01 §"Kiểm thử số dư"), khớp script CSDL với code, múi giờ.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, API_DIR, seedBase, call, one, rows, balance, redeem, start, watchFully, addUser, addUserWithLedger,
  ledgerViolations, stats,
} from './helpers.mjs';

/* ---------- đọc script CSDL của nhóm và mã nguồn API ---------- */
const sql = fs.readFileSync(join(ROOT, 'youtube_xu_database.sql'), 'utf8');

function sqlColumns(text) {
  const tables = {};
  for (const m of text.matchAll(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\n\)\s*;/gi)) {
    const cols = m[2].split('\n').map(l => l.trim())
      .filter(l => /^[a-z_]+\s+/i.test(l) && !/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(l))
      .map(l => l.split(/\s+/)[0].toLowerCase());
    tables[m[1].toLowerCase()] = new Set(cols);
  }
  return tables;
}

function routeFiles(dir = API_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? routeFiles(join(dir, e.name)) : e.name === 'route.js' ? [join(dir, e.name)] : []);
}

describe('Script CSDL và mã nguồn (INT)', () => {
  it('INT-01 | script CSDL có đủ cột mà các câu INSERT/UPDATE trong code đang dùng', () => {
    const tables = sqlColumns(sql);
    assert.ok(Object.keys(tables).length >= 8, 'không đọc được các bảng từ youtube_xu_database.sql');
    const missing = new Set();
    for (const file of routeFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/INSERT INTO\s+(\w+)\s*\(([^)]*)\)/gi)) {
        const t = m[1].toLowerCase();
        for (const c of m[2].split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
          if (tables[t] && !tables[t].has(c)) missing.add(`${t}.${c}`);
        }
      }
      for (const m of src.matchAll(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)\s+WHERE/gi)) {
        const t = m[1].toLowerCase();
        for (const a of m[2].matchAll(/(\w+)\s*=/g)) {
          const c = a[1].toLowerCase();
          if (tables[t] && !tables[t].has(c)) missing.add(`${t}.${c}`);
        }
      }
    }
    assert.deepEqual([...missing], [], `Code dùng cột không có trong youtube_xu_database.sql: ${[...missing].join(', ')} -> đăng ký tài khoản (register) sẽ lỗi 500 trên CSDL dựng từ script này`);
  });

  it('INT-02 | script CSDL chạy được trên MySQL (code dùng mysql2, .env.local trỏ tới MySQL của XAMPP)', () => {
    const tsql = { 'IDENTITY(...)': /\bIDENTITY\s*\(/i, 'lệnh GO': /^\s*GO\s*$/im, NVARCHAR: /\bNVARCHAR\b/i, 'SET IDENTITY_INSERT': /SET IDENTITY_INSERT/i, 'IF DB_ID(...)': /IF DB_ID/i };
    const found = Object.entries(tsql).filter(([, re]) => re.test(sql)).map(([k]) => k);
    assert.deepEqual(found, [], `youtube_xu_database.sql viết bằng T-SQL (SQL Server), chứa: ${found.join(', ')} -> không chạy được trên MySQL; thư mục migrations/ đang trống`);
  });
});

describe('Đối soát số dư xu (TEST-01 §Kiểm thử số dư)', () => {
  beforeEach(() => seedBase());

  it('INT-03 | sau kịch bản hỗn hợp (xem QC, hoa hồng, đổi quà, từ chối, thu hồi): sổ cái khớp số dư, ngân sách khớp lượt xem', async () => {
    const A = addUser({ xu_balance: 0 });                          // người giới thiệu
    const B = addUserWithLedger(12000, { referred_by: A });
    const C = addUserWithLedger(6000);

    for (const ad of [1, 2, 3]) await watchFully(B, ad);           // B: +10 +5 +20 (A nhận hoa hồng)
    for (const ad of [1, 2]) await watchFully(C, ad);              // C: +10 +5
    assert.equal((await redeem(B, 1)).status, 200);                // thẻ 10k, tự duyệt
    const big = await redeem(B, 4);                                // 100k, chờ duyệt
    assert.equal(big.body.status, 'PENDING');
    const orderId = one("SELECT redemption_id AS id FROM redemptions WHERE user_id = ? AND status = 'PENDING'", B).id;
    const rej = await call('redemptions/[id]/process', 'PATCH', { params: { id: orderId }, body: { action: 'REJECT', admin_id: 1 } });
    assert.equal(rej.status, 200, rej.raw);
    const rev = await call('admin/fraud', 'POST', { body: { action: 'REVOKE_XU', target_user_id: C, revoke_amount: 200, reason: 'test' } });
    assert.equal(rev.status, 200, rev.raw);

    for (const u of [A, B, C]) assert.deepEqual(ledgerViolations(u), [], `ví của user ${u} không khớp sổ cái`);

    // Mỗi lượt xem COMPLETED có đúng 1 dòng EARN với số xu bằng reward_xu của lượt đó
    for (const v of rows("SELECT view_id, reward_xu FROM ad_views WHERE view_status = 'COMPLETED'")) {
      const earn = rows("SELECT amount FROM xu_transactions WHERE view_id = ? AND txn_type = 'EARN'", v.view_id);
      assert.equal(earn.length, 1, `lượt xem #${v.view_id} có ${earn.length} dòng EARN`);
      assert.equal(earn[0].amount, v.reward_xu);
    }
    // spent_xu của mỗi quảng cáo bằng tổng xu thưởng các lượt đã hoàn tất
    for (const ad of rows('SELECT ad_id, spent_xu FROM ads')) {
      const sum = one("SELECT COALESCE(SUM(reward_xu), 0) AS s FROM ad_views WHERE ad_id = ? AND view_status = 'COMPLETED'", ad.ad_id).s;
      assert.equal(ad.spent_xu, sum, `ngân sách đã dùng của QC #${ad.ad_id} lệch tổng thưởng`);
    }
    assert.ok(rows('SELECT xu_balance FROM users').every(r => r.xu_balance >= 0), 'có số dư âm');
    assert.equal(stats.leaked, 0, 'có transaction bị treo');
  });
});

describe('Múi giờ (EXT)', () => {
  beforeEach(() => seedBase());

  it('EXT-44 | ngày áp dụng hạn mức 50 lượt/500 xu tính theo giờ Việt Nam (UTC+7), không theo UTC', async () => {
    const RealDate = Date;
    const FIXED = RealDate.parse('2026-10-28T18:30:00Z');          // = 01:30 sáng ngày 29/10 giờ Việt Nam
    class FakeDate extends RealDate {
      constructor(...a) { a.length ? super(...a) : super(FIXED); }
      static now() { return FIXED; }
    }
    globalThis.Date = FakeDate;
    let s;
    try { s = await start(9, 1); } finally { globalThis.Date = RealDate; }
    assert.equal(s.status, 200, s.raw);
    const v = one('SELECT view_date AS d FROM ad_views WHERE view_token = ?', s.body.view_token);
    assert.equal(v.d, '2026-10-29',
      `Lúc 01:30 ngày 29/10 (giờ VN) lượt xem được ghi vào ngày ${v.d}: code dùng new Date().toISOString() (UTC) nên hạn mức "ngày" chỉ làm mới lúc 07:00 sáng`);
  });
});
