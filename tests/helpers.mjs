// Tiện ích dùng chung cho các file test.
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, resetDb, injectFault, stats } from './setup/fake-db.mjs';

export { db, injectFault, stats };
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const API_DIR = join(ROOT, 'app', 'api');

/* ------------------------------ ngày giờ ------------------------------ */
export const TODAY = () => new Date().toISOString().split('T')[0];
export const dayOffset = n => new Date(Date.now() + n * 864e5).toISOString().split('T')[0];

/* ------------------------------ gọi route ------------------------------ */
export const routeExists = rel => fs.existsSync(join(API_DIR, rel, 'route.js'));

/**
 * Gọi trực tiếp route handler như Next.js sẽ gọi.
 * rel: đường dẫn thư mục dưới app/api, vd 'views/start' hoặc 'ads/[id]/status'
 */
export async function call(rel, method, { body, query, headers = {}, params } = {}) {
  const mod = await import(pathToFileURL(join(API_DIR, rel, 'route.js')).href);
  const path = rel.replace(/\[(\w+)\]/g, (_, k) => params?.[k] ?? k);
  const url = new URL('http://localhost/api/' + path);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const init = { method, headers: { 'content-type': 'application/json', ...headers } };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await mod[method](new Request(url, init), { params: params || {} });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: res.status, body: json, raw: text };
}

/* ------------------------------ truy vấn nhanh ------------------------------ */
export const rows = (sql, ...p) => db.prepare(sql).all(...p).map(r => ({ ...r }));
export const one = (sql, ...p) => { const r = db.prepare(sql).get(...p); return r ? { ...r } : undefined; };
export const balance = id => one('SELECT xu_balance AS b FROM users WHERE user_id = ?', id).b;
export const countOf = (table, where = '1=1', ...p) => one(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`, ...p).c;

function insert(table, row) {
  const cols = Object.keys(row);
  const info = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...Object.values(row));
  return Number(info.lastInsertRowid);
}

/* ------------------------------ dữ liệu mẫu ------------------------------ */
const SAMPLE_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG'; // mật khẩu mẫu 123456 của nhóm
export { SAMPLE_HASH };
let seq = 0;

export function addUser(o = {}) {
  const n = ++seq + 1000;
  return insert('users', {
    email: `u${n}@test.vn`, phone: `09${String(10000000 + n)}`, referral_code: `YX9${String(n).padStart(7, '0')}`,
    full_name: `User ${n}`, password_hash: SAMPLE_HASH, birth_year: 2000, gender: 'MALE', province: 'Hà Nội',
    system_role: 'VIEWER', account_status: 'ACTIVE', xu_balance: 0, referred_by: null, ...o,
  });
}

export function addAd(o = {}) {
  return insert('ads', {
    advertiser_id: 2, category_id: 1, title: 'Quảng cáo test', video_url: 'https://www.youtube.com/watch?v=abc123',
    duration_sec: 30, reward_xu: 10, budget_xu: 10000, spent_xu: 0, start_date: dayOffset(-5), end_date: dayOffset(25),
    status: 'ACTIVE', ...o,
  });
}

export const addTargeting = (ad_id, o = {}) => insert('ad_targeting', { ad_id, gender: null, age_from: null, age_to: null, province: null, ...o });

export function addReward(o = {}) {
  return insert('rewards', { reward_name: 'Thẻ 10k', reward_type: 'PHONE_CARD', face_value_vnd: 10000, xu_cost: 1000, stock_qty: 10, is_active: 1, ...o });
}

let tok = 0;
export function addView(o = {}) {
  return insert('ad_views', {
    user_id: 5, ad_id: 1, view_token: `tok_seed_${++tok}`, view_date: TODAY(), watched_seconds: 30, reward_xu: 10,
    device_id: 'DEV-SEED', ip_address: '127.0.0.1', view_status: 'COMPLETED', completed_at: new Date().toISOString(), ...o,
  });
}

export function addTxn(user_id, txn_type, amount, balance_after, o = {}) {
  return insert('xu_transactions', { user_id, view_id: null, redemption_id: null, txn_type, amount, balance_after, note: 'seed', ...o });
}

/** Bộ dữ liệu nền (mô phỏng DB-03): 1 admin, 2 nhà QC, các viewer, 7 quảng cáo, 6 quà. */
export function seedBase() {
  resetDb();
  [[1, 'Quảng cáo Game'], [2, 'Giáo dục'], [3, 'Thời trang']].forEach(([id, name]) => insert('ad_categories', { category_id: id, category_name: name }));
  const U = (user_id, email, name, role, o = {}) => addUser({
    user_id, email, phone: `0900${String(user_id).padStart(6, '0')}`, full_name: name, system_role: role,
    referral_code: `YX${String(user_id).padStart(8, '0')}`, ...o,
  });
  U(1, 'admin@youtubexu.vn', 'Nguyễn Quản Trị', 'ADMIN', { birth_year: 1995 });
  U(2, 'adv.a@gmail.com', 'Nhà QC A', 'ADVERTISER', { xu_balance: 50000, gender: 'OTHER' });
  U(3, 'adv.b@gmail.com', 'Nhà QC B', 'ADVERTISER', { xu_balance: 100000, gender: 'OTHER' });
  U(5, 'long.tv@gmail.com', 'Trần Văn Long', 'VIEWER', { birth_year: 2002, gender: 'MALE', province: 'Hà Nội', xu_balance: 1520 });
  U(6, 'nhi.lt@gmail.com', 'Lê Thị Nhi', 'VIEWER', { birth_year: 2003, gender: 'FEMALE', province: 'TP.HCM', xu_balance: 500, referred_by: 5 });
  U(7, 'tu.pm@gmail.com', 'Phạm Minh Tú', 'VIEWER', { birth_year: 2001, gender: 'MALE', province: 'Đà Nẵng', xu_balance: 120, referred_by: 5 });
  U(8, 'lam.hm@gmail.com', 'Hoàng Mai Lâm', 'VIEWER', { birth_year: 2000, gender: 'FEMALE', province: 'Hà Nội', xu_balance: 2450 });
  U(9, 'luong.nv@gmail.com', 'Nguyễn Văn Lượng', 'VIEWER', { birth_year: 2004, gender: 'MALE', province: 'Cần Thơ', xu_balance: 0 });
  U(10, 'bot@gmail.com', 'Tài khoản nghi vấn', 'VIEWER', { birth_year: 1999, gender: 'OTHER', account_status: 'LOCKED' });
  // ads: 1-3 ACTIVE, 4 PENDING, 5 ENDED, 6 REJECTED, 7 PAUSED
  addAd({ ad_id: 1, advertiser_id: 2, category_id: 1, duration_sec: 30, reward_xu: 10, title: 'Kiếm Thế Origin' });
  addAd({ ad_id: 2, advertiser_id: 2, category_id: 3, duration_sec: 15, reward_xu: 5, title: 'Shopee 10.10' });
  addAd({ ad_id: 3, advertiser_id: 3, category_id: 2, duration_sec: 45, reward_xu: 20, title: 'Sữa Vinamilk' });
  addAd({ ad_id: 4, advertiser_id: 2, status: 'PENDING', title: 'Khóa học Python' });
  addAd({ ad_id: 5, advertiser_id: 2, status: 'ENDED', title: 'Đại chiến bang hội' });
  addAd({ ad_id: 6, advertiser_id: 3, status: 'REJECTED', title: 'Đầu tư tiền ảo', reject_reason: 'Vi phạm' });
  addAd({ ad_id: 7, advertiser_id: 3, status: 'PAUSED', title: 'Tạm dừng' });
  // rewards: 1 thẻ 10k, 2 thẻ 20k, 3 voucher 50k, 4 voucher 100k (chờ duyệt), 5 hết hàng, 6 đã đóng
  addReward({ reward_id: 1, reward_name: 'Thẻ Viettel 10.000đ', face_value_vnd: 10000, xu_cost: 1000, stock_qty: 200 });
  addReward({ reward_id: 2, reward_name: 'Thẻ Viettel 20.000đ', face_value_vnd: 20000, xu_cost: 2000, stock_qty: 150 });
  addReward({ reward_id: 3, reward_name: 'Voucher GrabFood 50.000đ', reward_type: 'E_VOUCHER', face_value_vnd: 50000, xu_cost: 5000, stock_qty: 40 });
  addReward({ reward_id: 4, reward_name: 'Voucher MoMo 100.000đ', reward_type: 'E_VOUCHER', face_value_vnd: 100000, xu_cost: 10000, stock_qty: 25 });
  addReward({ reward_id: 5, reward_name: 'Thẻ hết hàng', stock_qty: 0 });
  addReward({ reward_id: 6, reward_name: 'Thẻ đã đóng', is_active: 0 });
}

/* ------------------------------ thao tác nghiệp vụ ------------------------------ */
export const start = (user_id, ad_id, extra = {}) => call('views/start', 'POST', { body: { user_id, ad_id, ...extra } });
export const complete = body => call('views/complete', 'POST', { body });

/** Giả lập "đã trôi qua N giây" bằng cách lùi started_at của lượt xem (không cần chờ thật). */
export function backdate(view_token, seconds) {
  db.prepare("UPDATE ad_views SET started_at = datetime('now', ?) WHERE view_token = ?").run(`-${seconds} seconds`, view_token);
}

/** Người xem xem trọn một quảng cáo theo đúng luật: start -> (đợi đủ giờ) -> complete. */
export async function watchFully(user_id, ad_id) {
  const dur = one('SELECT duration_sec FROM ads WHERE ad_id = ?', ad_id).duration_sec;
  const s = await start(user_id, ad_id);
  if (s.status !== 200) throw new Error(`start thất bại: ${s.status} ${s.raw}`);
  backdate(s.body.view_token, dur + 1);
  const c = await complete({ user_id, ad_id, view_token: s.body.view_token, watched_seconds: dur });
  return { start: s, complete: c, token: s.body.view_token };
}

export const redeem = (user_id, reward_id) => call('redeem', 'POST', { body: { user_id, reward_id } });
export const login = (emailOrPhone, password) => call('auth/login', 'POST', { body: { emailOrPhone, password } });

/** Header "danh tính" theo quy ước x-user-id mà route /auth/me đang dùng. */
export const as = user_id => ({ 'x-user-id': String(user_id) });

/** Tuổi người dùng theo cách app đang tính (năm hiện tại - năm sinh). */
export const ageOf = u => new Date().getFullYear() - u.birth_year;

/** Người xem có thuộc đối tượng mục tiêu của quảng cáo không? (Không có dòng targeting = mọi người; nhiều dòng = HOẶC) */
export function matchesTargeting(user, targetingRows) {
  if (!targetingRows.length) return true;
  const age = ageOf(user);
  return targetingRows.some(t =>
    (t.gender == null || t.gender === user.gender) &&
    (t.age_from == null || age >= t.age_from) &&
    (t.age_to == null || age <= t.age_to) &&
    (t.province == null || t.province === user.province));
}

/**
 * Kiểm tra bất biến sổ cái cho một ví bắt đầu từ sổ cái hợp lệ:
 *  - tổng các giao dịch = số dư; balance_after của dòng cuối = số dư;
 *  - balance_after mỗi dòng = balance_after dòng trước + amount;
 *  - số dư không âm.
 * Trả về mảng mô tả vi phạm (rỗng = ổn).
 */
export function ledgerViolations(user_id) {
  const bal = balance(user_id);
  const txns = rows('SELECT txn_id, txn_type, amount, balance_after FROM xu_transactions WHERE user_id = ? ORDER BY txn_id', user_id);
  const problems = [];
  if (bal < 0) problems.push(`số dư âm: ${bal}`);
  let running = 0;
  for (const t of txns) {
    running += t.amount;
    if (t.balance_after !== running) problems.push(`txn #${t.txn_id} (${t.txn_type}): balance_after=${t.balance_after} nhưng cộng dồn=${running}`);
  }
  if (running !== bal) problems.push(`tổng giao dịch=${running} khác số dư ví=${bal}`);
  return problems;
}

/** Tạo viewer mới với số dư đầu kỳ có sổ cái (dòng ADJUST mở đầu) để kiểm tra đối soát. */
export function addUserWithLedger(opening, o = {}) {
  const id = addUser({ xu_balance: opening, ...o });
  if (opening > 0) addTxn(id, 'ADJUST', opening, opening, { note: 'Số dư đầu kỳ' });
  return id;
}
