// Schema dùng cho test (SQLite) – dịch từ youtube_xu_database.sql (T-SQL) sang cú pháp chạy được.
// LƯU Ý: thêm cột users.referral_code vì code (register/affiliate) đang dùng cột này
// nhưng file SQL của nhóm KHÔNG có (xem test INT-01).
export const SCHEMA = `
CREATE TABLE ad_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL UNIQUE
);
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  referral_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  birth_year INTEGER NULL,
  gender TEXT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  province TEXT NULL,
  system_role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (system_role IN ('VIEWER','ADVERTISER','ADMIN')),
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE','LOCKED')),
  xu_balance INTEGER NOT NULL DEFAULT 0,
  referred_by INTEGER NULL REFERENCES users(user_id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_balance CHECK (xu_balance >= 0)
);
CREATE TABLE ads (
  ad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  advertiser_id INTEGER NOT NULL REFERENCES users(user_id),
  category_id INTEGER NOT NULL REFERENCES ad_categories(category_id),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  reward_xu INTEGER NOT NULL,
  budget_xu INTEGER NOT NULL,
  spent_xu INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT','PENDING','ACTIVE','PAUSED','ENDED','REJECTED')),
  reject_reason TEXT NULL,
  reviewed_by INTEGER NULL REFERENCES users(user_id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_duration CHECK (duration_sec BETWEEN 5 AND 60),
  CONSTRAINT chk_budget CHECK (budget_xu > 0 AND spent_xu <= budget_xu),
  CONSTRAINT chk_dates CHECK (end_date >= start_date)
);
CREATE TABLE ad_targeting (
  target_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad_id INTEGER NOT NULL REFERENCES ads(ad_id) ON DELETE CASCADE,
  gender TEXT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  age_from INTEGER NULL,
  age_to INTEGER NULL,
  province TEXT NULL
);
CREATE TABLE ad_views (
  view_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  ad_id INTEGER NOT NULL REFERENCES ads(ad_id),
  view_token TEXT NOT NULL UNIQUE,
  view_date DATE NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  reward_xu INTEGER NOT NULL DEFAULT 0,
  device_id TEXT NULL,
  ip_address TEXT NULL,
  view_status TEXT NOT NULL DEFAULT 'STARTED' CHECK (view_status IN ('STARTED','COMPLETED','INVALID')),
  CONSTRAINT uq_user_ad_day UNIQUE (user_id, ad_id, view_date)
);
CREATE TABLE rewards (
  reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
  reward_name TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('PHONE_CARD','E_VOUCHER')),
  face_value_vnd INTEGER NOT NULL,
  xu_cost INTEGER NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT chk_cost CHECK (xu_cost > 0 AND stock_qty >= 0)
);
CREATE TABLE redemptions (
  redemption_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  reward_id INTEGER NOT NULL REFERENCES rewards(reward_id),
  xu_spent INTEGER NOT NULL,
  gift_code TEXT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DELIVERED','REJECTED')),
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  processed_by INTEGER NULL REFERENCES users(user_id)
);
CREATE TABLE xu_transactions (
  txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  view_id INTEGER NULL REFERENCES ad_views(view_id),
  redemption_id INTEGER NULL REFERENCES redemptions(redemption_id),
  txn_type TEXT NOT NULL CHECK (txn_type IN ('EARN','REDEEM','REFUND','BONUS','ADJUST')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
