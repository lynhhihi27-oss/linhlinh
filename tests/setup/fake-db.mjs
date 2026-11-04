// Thay thế lib/db.js (mysql2) bằng SQLite in-memory để chạy SQL THẬT của ứng dụng.
//
// Mô hình giao dịch: mỗi transaction được xếp hàng tuần tự (như thể mọi `SELECT ... FOR UPDATE`
// đều khóa đúng). Nhờ đó các test song song kiểm tra được "logic có đúng khi các transaction
// chạy xen kẽ hay không" mà không cần MySQL thật. Các truy vấn KHÔNG nằm trong transaction
// (vd. views/start) vẫn xen kẽ thật tại mỗi `await`, nên lỗi check-then-act vẫn lộ ra.
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema.mjs';

export let db;
let inTx = false;
let txTail = Promise.resolve();
let faults = [];
export const stats = { leaked: 0 };

export function resetDb() {
  if (db) db.close();
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  inTx = false;
  txTail = Promise.resolve();
  faults = [];
  stats.leaked = 0;
}
resetDb();

/** Giả lập CSDL lỗi: câu SQL khớp `pattern` sẽ ném `error` (mặc định 1 lần). */
export function injectFault(pattern, error = new Error('ER_LOCK_DEADLOCK: Deadlock found when trying to get lock'), times = 1) {
  faults.push({ pattern, error, times });
}

function translate(sql) {
  const top = sql.match(/\bSELECT\s+TOP\s*\((\d+)\)/i);
  let translated = sql
    .replace(/\s+FOR UPDATE/gi, '')
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/ON DUPLICATE KEY UPDATE([\s\S]*)$/i, (_, rest) =>
      'ON CONFLICT(user_id, ad_id, view_date) DO UPDATE SET' + rest.replace(/VALUES\((\w+)\)/gi, 'excluded.$1'))
    .replace(/CONCAT\(([^)]*)\)/gi, (_, a) => '(' + a.split(',').map(s => s.trim()).join(' || ') + ')');
  if (top) {
    translated = translated.replace(/\bSELECT\s+TOP\s*\(\d+\)/i, 'SELECT');
    translated += ` LIMIT ${top[1]}`;
  }
  return translated;
}

function run(sql, params = []) {
  const f = faults.find(x => x.times > 0 && x.pattern.test(sql));
  if (f) { f.times--; throw f.error; }
  // mysql2 ném lỗi khi bind undefined -> mô phỏng đúng hành vi này
  if (params.some(p => p === undefined)) {
    throw new TypeError('Bind parameters must not contain undefined. To pass SQL NULL specify JS null');
  }
  const bound = params.map(p => (typeof p === 'boolean' ? Number(p) : p));
  const stmt = db.prepare(translate(sql));
  if (/^\s*(SELECT|WITH)\b/i.test(sql)) return stmt.all(...bound).map(r => ({ ...r }));
  const r = stmt.run(...bound);
  return { insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) };
}

export async function query(sql, params = []) { return run(sql, params); }

function acquireTx() {
  let release;
  const gate = new Promise(r => (release = r));
  const prev = txTail;
  txTail = prev.then(() => gate);
  return prev.then(() => release);
}

const pool = {
  async getConnection() {
    let releaseTx = null;
    const finish = () => { inTx = false; if (releaseTx) { releaseTx(); releaseTx = null; } };
    return {
      async beginTransaction() { releaseTx = await acquireTx(); db.exec('BEGIN'); inTx = true; },
      async commit() { if (inTx) db.exec('COMMIT'); finish(); },
      async rollback() { if (inTx) db.exec('ROLLBACK'); finish(); },   // MySQL: rollback khi không có txn = no-op
      async execute(sql, params = []) { return [run(sql, params), []]; },
      release() {
        // Trả connection về pool khi transaction còn mở = rò rỉ (MySQL thật sẽ giữ khóa mãi).
        if (inTx) { stats.leaked++; db.exec('ROLLBACK'); }
        finish();
      },
    };
  },
};
export default pool;
