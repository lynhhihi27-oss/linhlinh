-- =====================================================================
-- HỆ THỐNG: YOUTUBE XU - XEM QUẢNG CÁO NHẬN XU
-- MỤC ĐÍCH: SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU CHUẨN 3NF (MICROSOFT SQL SERVER / T-SQL)
-- THỰC HIỆN DỰA TRÊN SPRINT 1 (DB-01, DB-02, DB-03, SYS-01, SYS-02)
-- =====================================================================

-- 0. Xóa database cũ nếu đã tồn tại để tránh xung đột
IF DB_ID('youtube_xu') IS NOT NULL
BEGIN
    ALTER DATABASE youtube_xu SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE youtube_xu;
END
GO

CREATE DATABASE youtube_xu;
GO

USE youtube_xu;
GO

-- =====================================================================
-- 1. BẢNG DANH MỤC QUẢNG CÁO (ad_categories)
-- Phân loại quảng cáo: Game, Giáo dục, Thời trang, Ẩm thực, Công nghệ...
-- =====================================================================
CREATE TABLE ad_categories (
    category_id   INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- =====================================================================
-- 2. BẢNG NGƯỜI DÙNG (users)
-- Lưu trữ thông tin Người xem (VIEWER), Nhà quảng cáo (ADVERTISER), Admin (ADMIN)
-- =====================================================================
CREATE TABLE users (
    user_id        INT IDENTITY(1,1) PRIMARY KEY,
    email          VARCHAR(100) NOT NULL UNIQUE,
    phone          VARCHAR(15)  NOT NULL UNIQUE,
    full_name      NVARCHAR(100) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    birth_year     SMALLINT NULL,
    gender         VARCHAR(10) NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    province       NVARCHAR(50) NULL,
    system_role    VARCHAR(20) NOT NULL DEFAULT 'VIEWER' CHECK (system_role IN ('VIEWER', 'ADVERTISER', 'ADMIN')),
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'LOCKED')),
    xu_balance     INT NOT NULL DEFAULT 0,
    referred_by    INT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance CHECK (xu_balance >= 0),
    CONSTRAINT fk_users_referred FOREIGN KEY (referred_by) REFERENCES users(user_id) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- 3. BẢNG CHIẾN DỊCH QUẢNG CÁO (ads)
-- Chiến dịch video YouTube do nhà quảng cáo tạo và ngân sách tương ứng
-- =====================================================================
CREATE TABLE ads (
    ad_id          INT IDENTITY(1,1) PRIMARY KEY,
    advertiser_id  INT NOT NULL,
    category_id    INT NOT NULL,
    title          NVARCHAR(255) NOT NULL,
    video_url      VARCHAR(255) NOT NULL,
    duration_sec   INT NOT NULL,
    reward_xu      INT NOT NULL,
    budget_xu      INT NOT NULL,
    spent_xu       INT NOT NULL DEFAULT 0,
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED')),
    reject_reason  NVARCHAR(255) NULL,
    reviewed_by    INT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_duration CHECK (duration_sec BETWEEN 5 AND 60),
    CONSTRAINT chk_budget   CHECK (budget_xu > 0 AND spent_xu <= budget_xu),
    CONSTRAINT chk_dates    CHECK (end_date >= start_date),
    CONSTRAINT fk_ads_advertiser FOREIGN KEY (advertiser_id) REFERENCES users(user_id),
    CONSTRAINT fk_ads_category   FOREIGN KEY (category_id)   REFERENCES ad_categories(category_id),
    CONSTRAINT fk_ads_reviewer   FOREIGN KEY (reviewed_by)   REFERENCES users(user_id) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- 4. BẢNG ĐỐI TƯỢNG MỤC TIÊU (ad_targeting)
-- Cấu hình đối tượng mục tiêu: giới tính, độ tuổi, khu vực địa lý
-- =====================================================================
CREATE TABLE ad_targeting (
    target_id INT IDENTITY(1,1) PRIMARY KEY,
    ad_id     INT NOT NULL,
    gender    VARCHAR(10) NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    age_from  TINYINT NULL,
    age_to    TINYINT NULL,
    province  NVARCHAR(50) NULL,
    CONSTRAINT fk_targeting_ad FOREIGN KEY (ad_id) REFERENCES ads(ad_id) ON DELETE CASCADE
);
GO

-- =====================================================================
-- 5. BẢNG LƯỢT XEM QUẢNG CÁO (ad_views)
-- Ghi nhận mỗi phiên xem, mã token xác thực, chống gian lận & xem lặp
-- Ràng buộc quan trọng: UNIQUE(user_id, ad_id, view_date) -> 1 lượt/qc/ngày
-- =====================================================================
CREATE TABLE ad_views (
    view_id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT NOT NULL,
    ad_id           INT NOT NULL,
    view_token      VARCHAR(64) NOT NULL UNIQUE,
    view_date       DATE NOT NULL,
    started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME NULL,
    watched_seconds INT NOT NULL DEFAULT 0,
    reward_xu       INT NOT NULL DEFAULT 0,
    device_id       VARCHAR(64) NULL,
    ip_address      VARCHAR(45) NULL,
    view_status     VARCHAR(20) NOT NULL DEFAULT 'STARTED' CHECK (view_status IN ('STARTED', 'COMPLETED', 'INVALID')),
    CONSTRAINT uq_user_ad_day UNIQUE (user_id, ad_id, view_date),
    CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_views_ad   FOREIGN KEY (ad_id)   REFERENCES ads(ad_id)
);
GO

-- =====================================================================
-- 6. BẢNG DANH MỤC QUÀ ĐỔI THƯỞNG (rewards)
-- Thẻ nạp điện thoại, voucher thương mại điện tử, số xu quy đổi, tồn kho
-- =====================================================================
CREATE TABLE rewards (
    reward_id      INT IDENTITY(1,1) PRIMARY KEY,
    reward_name    NVARCHAR(150) NOT NULL,
    reward_type    VARCHAR(20) NOT NULL CHECK (reward_type IN ('PHONE_CARD', 'E_VOUCHER')),
    face_value_vnd INT NOT NULL,
    xu_cost        INT NOT NULL,
    stock_qty      INT NOT NULL DEFAULT 0,
    is_active      BIT NOT NULL DEFAULT 1,
    CONSTRAINT chk_cost CHECK (xu_cost > 0 AND stock_qty >= 0)
);
GO

-- =====================================================================
-- 7. BẢNG ĐƠN ĐỔI THƯỞNG (redemptions)
-- Quản lý đơn đổi quà của người xem, trạng thái phê duyệt & mã quà gửi về
-- =====================================================================
CREATE TABLE redemptions (
    redemption_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id       INT NOT NULL,
    reward_id     INT NOT NULL,
    xu_spent      INT NOT NULL,
    gift_code     VARCHAR(50) NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DELIVERED', 'REJECTED')),
    requested_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at  DATETIME NULL,
    processed_by  INT NULL,
    CONSTRAINT fk_redemptions_user     FOREIGN KEY (user_id)      REFERENCES users(user_id),
    CONSTRAINT fk_redemptions_reward   FOREIGN KEY (reward_id)    REFERENCES rewards(reward_id),
    CONSTRAINT fk_redemptions_reviewer FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- 8. BẢNG SỔ CÁI BIẾN ĐỘNG XU (xu_transactions)
-- Ghi chép bất biến mọi giao dịch xu để kiểm toán, đối soát
-- =====================================================================
CREATE TABLE xu_transactions (
    txn_id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id       INT NOT NULL,
    view_id       BIGINT NULL,
    redemption_id INT NULL,
    txn_type      VARCHAR(20) NOT NULL CHECK (txn_type IN ('EARN', 'REDEEM', 'REFUND', 'BONUS', 'ADJUST')),
    amount        INT NOT NULL,
    balance_after INT NOT NULL,
    note          NVARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txns_user       FOREIGN KEY (user_id)       REFERENCES users(user_id),
    CONSTRAINT fk_txns_view       FOREIGN KEY (view_id)       REFERENCES ad_views(view_id),
    CONSTRAINT fk_txns_redemption FOREIGN KEY (redemption_id) REFERENCES redemptions(redemption_id)
);
GO

-- =====================================================================
-- CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (INDEXES)
-- =====================================================================
CREATE INDEX idx_views_user_date ON ad_views(user_id, view_date);
CREATE INDEX idx_txn_user_time   ON xu_transactions(user_id, created_at);
CREATE INDEX idx_ads_status      ON ads(status, start_date, end_date);
CREATE INDEX idx_redemptions_user ON redemptions(user_id, requested_at);
GO

-- =====================================================================
-- DỮ LIỆU MẪU (SEED DATA) PHONG PHÚ ĐỂ THUYẾT TRÌNH & DEMO
-- =====================================================================

-- 1. Danh mục quảng cáo
SET IDENTITY_INSERT ad_categories ON;
INSERT INTO ad_categories (category_id, category_name) VALUES
(1, N'Game & Thể thao điện tử'),
(2, N'Giáo dục & Khóa học trực tuyến'),
(3, N'Thời trang & Làm đẹp'),
(4, N'Ẩm thực & Đồ uống'),
(5, N'Công nghệ & Thiết bị điện tử'),
(6, N'Du lịch & Khách sạn');
SET IDENTITY_INSERT ad_categories OFF;
GO

-- 2. Tài khoản người dùng mẫu
-- Mật khẩu hash bên dưới là mật khẩu '123456' băm theo chuẩn bcrypt
SET IDENTITY_INSERT users ON;
INSERT INTO users (user_id, email, phone, full_name, password_hash, birth_year, gender, province, system_role, account_status, xu_balance, referred_by, created_at) VALUES
-- Admin hệ thống
(1, 'admin@youtubexu.vn', '0901000001', N'Nguyễn Quản Trị', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 1995, 'MALE', N'Hà Nội', 'ADMIN', 'ACTIVE', 0, NULL, '2026-09-01 08:00:00'),

-- Nhà quảng cáo (Advertisers)
(2, 'adv.vng@gmail.com', '0902000001', N'Công ty Cổ phần VNG', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2004, 'OTHER', N'TP.HCM', 'ADVERTISER', 'ACTIVE', 50000, NULL, '2026-09-05 09:30:00'),
(3, 'adv.shopee@gmail.com', '0902000002', N'Shopee Việt Nam', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2015, 'OTHER', N'TP.HCM', 'ADVERTISER', 'ACTIVE', 100000, NULL, '2026-09-10 10:00:00'),
(4, 'adv.vinamilk@gmail.com', '0902000003', N'Vinamilk Corporation', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 1976, 'OTHER', N'TP.HCM', 'ADVERTISER', 'ACTIVE', 80000, NULL, '2026-09-15 11:00:00'),

-- Người xem (Viewers)
(5, 'long.tv@gmail.com', '0903000001', N'Trần Văn Long', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2002, 'MALE', N'Hà Nội', 'VIEWER', 'ACTIVE', 1520, NULL, '2026-09-20 14:00:00'),
(6, 'nhi.lt@gmail.com', '0903000002', N'Lê Thị Nhi', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2003, 'FEMALE', N'TP.HCM', 'VIEWER', 'ACTIVE', 500, 5, '2026-09-21 15:30:00'),
(7, 'tu.pm@gmail.com', '0903000003', N'Phạm Minh Tú', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2001, 'MALE', N'Đà Nẵng', 'VIEWER', 'ACTIVE', 120, 5, '2026-09-22 16:15:00'),
(8, 'lam.hm@gmail.com', '0903000004', N'Hoàng Mai Lâm', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2000, 'FEMALE', N'Hà Nội', 'VIEWER', 'ACTIVE', 2450, NULL, '2026-09-23 09:00:00'),
(9, 'luong.nv@gmail.com', '0903000005', N'Nguyễn Văn Lượng', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 2004, 'MALE', N'Cần Thơ', 'VIEWER', 'ACTIVE', 0, NULL, '2026-09-24 10:20:00'),
(10, 'gianlan.bot@gmail.com', '0903000099', N'Tài Khoản Nghi Vấn Gian Lận', '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG', 1999, 'OTHER', N'Hà Nội', 'VIEWER', 'LOCKED', 0, NULL, '2026-09-25 11:00:00');
SET IDENTITY_INSERT users OFF;
GO

-- 3. Chiến dịch quảng cáo (ads)
SET IDENTITY_INSERT ads ON;
INSERT INTO ads (ad_id, advertiser_id, category_id, title, video_url, duration_sec, reward_xu, budget_xu, spent_xu, start_date, end_date, status, reject_reason, reviewed_by, created_at) VALUES
(1, 2, 1, N'Kiếm Thế Origin - Ra Mắt Phiên Bản Mới', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 30, 10, 10000, 3500, '2026-10-01', '2026-10-31', 'ACTIVE', NULL, 1, '2026-09-28 10:00:00'),
(2, 3, 3, N'Shopee 10.10 - Siêu Sale Ngày Đôi Giảm Đến 50%', 'https://www.youtube.com/watch?v=kXYiU_JCYtU', 15, 5, 50000, 12500, '2026-10-01', '2026-10-25', 'ACTIVE', NULL, 1, '2026-09-29 11:30:00'),
(3, 4, 4, N'Sữa tươi Vinamilk 100% - Năng Lượng Cho Cả Gia Đình', 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ', 45, 20, 20000, 8400, '2026-10-05', '2026-11-05', 'ACTIVE', NULL, 1, '2026-10-02 14:00:00'),
(4, 2, 2, N'Khóa Học Lập Trình Python Căn Bản Từ Zero Đến Hero', 'https://www.youtube.com/watch?v=rfscVS0vtbw', 25, 10, 5000, 0, '2026-10-15', '2026-11-15', 'PENDING', NULL, NULL, '2026-10-14 09:00:00'),
(5, 2, 1, N'Đại Chiến Bang Hội - Giải Đấu Mùa Thu VNG', 'https://www.youtube.com/watch?v=2Vv-BfVoq4g', 30, 10, 10000, 10000, '2026-09-01', '2026-09-30', 'ENDED', NULL, 1, '2026-08-25 08:30:00'),
(6, 3, 5, N'Đầu tư tiền ảo cam kết lãi 500%/tháng không rủi ro', 'https://www.youtube.com/watch?v=fakecrypto', 20, 10, 5000, 0, '2026-10-10', '2026-10-20', 'REJECTED', N'Nội dung vi phạm quy định: Quảng cáo cờ bạc/lừa đảo tài chính', 1, '2026-10-09 17:00:00');
SET IDENTITY_INSERT ads OFF;
GO

-- 4. Cấu hình đối tượng mục tiêu (ad_targeting)
SET IDENTITY_INSERT ad_targeting ON;
INSERT INTO ad_targeting (target_id, ad_id, gender, age_from, age_to, province) VALUES
(1, 1, 'MALE', 16, 30, NULL),                      -- Quảng cáo 1: Game hướng nam giới 16-30 toàn quốc
(2, 2, NULL, 16, 45, N'Hà Nội'),                     -- Quảng cáo 2: Shopee nhắm khu vực Hà Nội
(3, 2, NULL, 16, 45, N'TP.HCM'),                     -- Quảng cáo 2: Shopee nhắm khu vực TP.HCM
(4, 3, NULL, NULL, NULL, NULL),                     -- Quảng cáo 3: Vinamilk phủ sóng toàn quốc mọi đối tượng
(5, 4, NULL, 18, 30, N'Hà Nội');                     -- Quảng cáo 4: Khóa học nhắm thanh niên Hà Nội
SET IDENTITY_INSERT ad_targeting OFF;
GO

-- 5. Danh mục quà đổi thưởng (rewards)
-- Tỷ lệ quy đổi chuẩn: 1.000 xu = 10.000 VNĐ (1 xu = 10 VNĐ)
SET IDENTITY_INSERT rewards ON;
INSERT INTO rewards (reward_id, reward_name, reward_type, face_value_vnd, xu_cost, stock_qty, is_active) VALUES
(1, N'Thẻ cào Viettel 10.000đ', 'PHONE_CARD', 10000, 1000, 200, 1),
(2, N'Thẻ cào Viettel 20.000đ', 'PHONE_CARD', 20000, 2000, 150, 1),
(3, N'Thẻ cào Viettel 50.000đ', 'PHONE_CARD', 50000, 5000, 50, 1),
(4, N'Thẻ cào Vinaphone 20.000đ', 'PHONE_CARD', 20000, 2000, 100, 1),
(5, N'Thẻ cào Mobifone 20.000đ', 'PHONE_CARD', 20000, 2000, 80, 1),
(6, N'Voucher Shopee 20.000đ', 'E_VOUCHER', 20000, 2000, 120, 1),
(7, N'Voucher GrabFood 50.000đ', 'E_VOUCHER', 50000, 5000, 40, 1),
(8, N'Voucher Ví MoMo 100.000đ', 'E_VOUCHER', 100000, 10000, 25, 1);
SET IDENTITY_INSERT rewards OFF;
GO

-- 6. Lượt xem quảng cáo (ad_views)
SET IDENTITY_INSERT ad_views ON;
INSERT INTO ad_views (view_id, user_id, ad_id, view_token, view_date, started_at, completed_at, watched_seconds, reward_xu, device_id, ip_address, view_status) VALUES
-- User 5 (Trần Văn Long) xem 3 quảng cáo khác nhau trong ngày 2026-10-14
(1, 5, 1, 'tok_v1_long_ad1_20261014', '2026-10-14', '2026-10-14 09:00:00', '2026-10-14 09:00:31', 30, 10, 'DEV-IPHONE-15-LONG', '118.70.190.12', 'COMPLETED'),
(2, 5, 2, 'tok_v2_long_ad2_20261014', '2026-10-14', '2026-10-14 09:10:00', '2026-10-14 09:10:16', 15, 5, 'DEV-IPHONE-15-LONG', '118.70.190.12', 'COMPLETED'),
(3, 5, 3, 'tok_v3_long_ad3_20261014', '2026-10-14', '2026-10-14 09:20:00', '2026-10-14 09:20:46', 45, 20, 'DEV-IPHONE-15-LONG', '118.70.190.12', 'COMPLETED'),

-- User 6 (Lê Thị Nhi) xem quảng cáo 2
(4, 6, 2, 'tok_v4_nhi_ad2_20261014', '2026-10-14', '2026-10-14 10:00:00', '2026-10-14 10:00:16', 15, 5, 'DEV-SAMSUNG-S23-NHI', '14.161.20.55', 'COMPLETED'),

-- User 7 (Phạm Minh Tú) đang xem quảng cáo 1 dở dang (STARTED)
(5, 7, 1, 'tok_v5_tu_ad1_20261014', '2026-10-14', '2026-10-14 14:00:00', NULL, 12, 0, 'DEV-XIAOMI-13-TU', '113.160.88.90', 'STARTED'),

-- User 10 (Nghi vấn bot) bị phát hiện tua video, chuyển INVALID
(6, 10, 1, 'tok_v6_bot_ad1_20261014', '2026-10-14', '2026-10-14 15:00:00', '2026-10-14 15:00:03', 3, 0, 'DEV-EMULATOR-BOT', '45.12.33.99', 'INVALID');
SET IDENTITY_INSERT ad_views OFF;
GO

-- 7. Đơn đổi thưởng (redemptions)
SET IDENTITY_INSERT redemptions ON;
INSERT INTO redemptions (redemption_id, user_id, reward_id, xu_spent, gift_code, status, requested_at, processed_at, processed_by) VALUES
-- User 5 đổi thẻ 10k tự động duyệt vì ≤ 50.000đ
(1, 5, 1, 1000, 'VT10K-9834-8219-4821', 'APPROVED', '2026-10-14 10:00:00', '2026-10-14 10:00:05', 1),
-- User 8 đổi thẻ 20k đã giao mã
(2, 8, 2, 2000, 'VT20K-1122-3344-5566', 'DELIVERED', '2026-10-14 11:30:00', '2026-10-14 11:30:10', 1),
-- User 8 yêu cầu đổi voucher MoMo 100k (> 50.000đ) nên PENDING chờ Admin duyệt thủ công
(3, 8, 8, 10000, NULL, 'PENDING', '2026-10-14 16:00:00', NULL, NULL);
SET IDENTITY_INSERT redemptions OFF;
GO

-- 8. Sổ cái xu (xu_transactions)
-- Lưu vết chi tiết, khớp đúng số dư tích lũy của từng người dùng
SET IDENTITY_INSERT xu_transactions ON;
INSERT INTO xu_transactions (txn_id, user_id, view_id, redemption_id, txn_type, amount, balance_after, note, created_at) VALUES
-- Lịch sử ví User 5 (Trần Văn Long): Ban đầu thưởng mời bạn (+500), xem 3 video (+10, +5, +20), đổi thẻ (-1000), còn dư 1520 xu (tính cả xu cũ 1985)
(1, 5, NULL, NULL, 'BONUS', 500, 2500, N'Thưởng giới thiệu bạn bè đăng ký thành công (Lê Thị Nhi)', '2026-09-22 10:00:00'),
(2, 5, 1, NULL, 'EARN', 10, 2510, N'Xem hoàn tất quảng cáo: Kiếm Thế Origin', '2026-10-14 09:00:31'),
(3, 5, 2, NULL, 'EARN', 5, 2515, N'Xem hoàn tất quảng cáo: Shopee 10.10', '2026-10-14 09:10:16'),
(4, 5, 3, NULL, 'EARN', 20, 2535, N'Xem hoàn tất quảng cáo: Sữa tươi Vinamilk 100%', '2026-10-14 09:20:46'),
(5, 5, NULL, 1, 'REDEEM', -1000, 1535, N'Đổi Thẻ cào Viettel 10.000đ thành công', '2026-10-14 10:00:05'),
(6, 5, NULL, NULL, 'ADJUST', -15, 1520, N'Điều chỉnh kiểm toán số dư cuối kỳ', '2026-10-14 12:00:00'),

-- Lịch sử ví User 6 (Lê Thị Nhi)
(7, 6, 4, NULL, 'EARN', 5, 500, N'Xem hoàn tất quảng cáo: Shopee 10.10', '2026-10-14 10:00:16'),

-- Lịch sử User 10 bị phát hiện gian lận và thu hồi toàn bộ xu
(8, 10, NULL, NULL, 'ADJUST', -200, 0, N'Admin thu hồi xu do phát hiện chạy tool giả lập', '2026-10-14 15:30:00');
SET IDENTITY_INSERT xu_transactions OFF;
GO

-- =====================================================================
-- KẾT THÚC SCRIPT KHỞI TẠO CSDL
-- =====================================================================
