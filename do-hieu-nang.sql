-- =====================================================================
-- ĐO HIỆU NĂNG TRUY VẤN (TRƯỚC / SAU KHI THÊM INDEX)
--
-- Cách làm:
--  1. Tạo bản sao riêng: mở youtube_xu_database.sql, thay `youtube_xu` thành `youtube_xu_perf`
--     (Ctrl+H) rồi chạy. Không đo trên database demo vì dữ liệu mẫu quá nhỏ.
--  2. Chạy PHẦN A để nạp dữ liệu lớn vào bản sao (script từ chối chạy nếu tên database
--     không chứa chữ "perf").
--  3. Chạy PHẦN B, ghi logical reads và elapsed time (tab Messages) vào báo cáo kiểm thử: đây là số "trước".
--  4. Chạy migration 20261112_sprint5_indexes_and_constraints.sql trên bản sao.
--  5. Chạy lại PHẦN B, ghi số "sau". Chỉ giữ index nào cải thiện rõ.
--
-- Chỉ ghi số đã đo thật vào báo cáo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PHẦN A: NẠP DỮ LIỆU THỬ (một batch duy nhất để lệnh RETURN dừng cả phần)
-- ---------------------------------------------------------------------
USE youtube_xu_perf;
GO

SET NOCOUNT ON;

IF DB_NAME() NOT LIKE N'%perf%'
BEGIN
    RAISERROR(N'DỪNG: chỉ nạp dữ liệu thử vào bản sao có chữ "perf" trong tên database.', 16, 1);
    RETURN;
END

DECLARE @soUser INT = 5000;
DECLARE @soSoCai INT = 200000;

-- 1) Người xem giả (có thể chạy lại, không tạo trùng)
WITH n AS (
    SELECT TOP (@soUser) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO users (email, phone, referral_code, full_name, password_hash, system_role, xu_balance)
SELECT 'perf' + CAST(n.i AS VARCHAR(10)) + '@test.local',
       '08' + RIGHT('00000000' + CAST(n.i AS VARCHAR(8)), 8),
       'PF' + RIGHT('00000000' + CAST(n.i AS VARCHAR(8)), 8),
       N'Người dùng thử ' + CAST(n.i AS NVARCHAR(10)),
       'x', 'VIEWER', 0
FROM n
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'perf' + CAST(n.i AS VARCHAR(10)) + '@test.local');

-- 2) Sổ cái xu: phần lớn EARN, một phần REDEEM, rải trong 90 ngày
WITH pu AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) - 1 AS rn
    FROM users WHERE email LIKE 'perf%@test.local'
), n AS (
    SELECT TOP (@soSoCai) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO xu_transactions (user_id, txn_type, amount, balance_after, created_at)
SELECT pu.user_id,
       CASE WHEN n.i % 10 = 0 THEN 'REDEEM' ELSE 'EARN' END,
       CASE WHEN n.i % 10 = 0 THEN -50 ELSE 5 END,
       0,
       DATEADD(MINUTE, -CAST(n.i % 129600 AS INT), SYSDATETIME())
FROM n
JOIN pu ON pu.rn = n.i % (SELECT COUNT(*) FROM pu);

-- 3) Lượt xem quảng cáo: người dùng x chiến dịch đang chạy x 30 ngày, lấy 1/7 tổ hợp
WITH pu AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn
    FROM users WHERE email LIKE 'perf%@test.local'
), act AS (
    SELECT ad_id FROM ads WHERE status = 'ACTIVE'
), d AS (
    SELECT TOP (30) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects
)
INSERT INTO ad_views (user_id, ad_id, view_token, view_date, started_at, completed_at, watched_seconds, reward_xu, view_status)
SELECT pu.user_id, act.ad_id,
       'pf' + CONVERT(VARCHAR(36), NEWID()),
       DATEADD(DAY, -CAST(d.k AS INT), CAST(SYSDATETIME() AS DATE)),
       SYSDATETIME(), SYSDATETIME(), 30,
       CASE WHEN d.k % 5 = 0 THEN 0 ELSE 10 END,
       CASE WHEN d.k % 5 = 0 THEN 'INVALID' ELSE 'COMPLETED' END
FROM pu CROSS JOIN act CROSS JOIN d
WHERE (pu.rn + act.ad_id + d.k) % 7 = 0
  AND NOT EXISTS (
      SELECT 1 FROM ad_views v
      WHERE v.user_id = pu.user_id AND v.ad_id = act.ad_id
        AND v.view_date = DATEADD(DAY, -CAST(d.k AS INT), CAST(SYSDATETIME() AS DATE)));

SELECT 'users' AS bang, COUNT(*) AS so_dong FROM users
UNION ALL SELECT 'xu_transactions', COUNT(*) FROM xu_transactions
UNION ALL SELECT 'ad_views', COUNT(*) FROM ad_views;
GO

-- ---------------------------------------------------------------------
-- PHẦN B: ĐO. Chạy trước và sau khi thêm index, ghi từ tab Messages.
-- Bật "Include Actual Execution Plan" (Ctrl+M) để xem Scan hay Seek.
-- ---------------------------------------------------------------------
USE youtube_xu_perf;
GO

SET NOCOUNT ON;
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

DECLARE @cat INT = (SELECT TOP 1 category_id FROM ad_categories ORDER BY category_id);
DECLARE @u   INT = (SELECT TOP 1 user_id FROM xu_transactions GROUP BY user_id ORDER BY COUNT(*) DESC);
DECLARE @adv INT = (SELECT TOP 1 advertiser_id FROM ads GROUP BY advertiser_id ORDER BY COUNT(*) DESC);

PRINT '--- Q1: Quảng cáo đang chạy theo danh mục ---';
SELECT ad_id, title, reward_xu, duration_sec
FROM ads
WHERE status = 'ACTIVE' AND category_id = @cat
  AND CAST(SYSDATETIME() AS DATE) BETWEEN start_date AND end_date;

PRINT '--- Q2a: Lịch sử ví, 25 giao dịch đầu ---';
SELECT TOP (25) txn_id, txn_type, amount, balance_after, created_at
FROM xu_transactions
WHERE user_id = @u
ORDER BY created_at DESC, txn_id DESC;

PRINT '--- Q2b: Lịch sử ví, lọc theo loại EARN ---';
SELECT TOP (25) txn_id, txn_type, amount, balance_after, created_at
FROM xu_transactions
WHERE user_id = @u AND txn_type = 'EARN'
ORDER BY created_at DESC, txn_id DESC;

PRINT '--- Q3: Thống kê chiến dịch của một nhà quảng cáo ---';
SELECT a.ad_id, a.title, a.status,
       COUNT(v.view_id) AS tong_phien,
       SUM(CASE WHEN v.view_status = 'COMPLETED' THEN 1 ELSE 0 END) AS hoan_tat,
       SUM(CASE WHEN v.view_status = 'INVALID' THEN 1 ELSE 0 END) AS khong_hop_le
FROM ads a
LEFT JOIN ad_views v ON v.ad_id = a.ad_id
WHERE a.advertiser_id = @adv
GROUP BY a.ad_id, a.title, a.status;

PRINT '--- Q4: Đơn đổi quà chờ duyệt (Admin) ---';
SELECT TOP (50) redemption_id, user_id, reward_id, xu_spent, requested_at
FROM redemptions
WHERE status = 'PENDING'
ORDER BY requested_at;

PRINT '--- Q5: Bảng xếp hạng Top 20 trong 30 ngày ---';
SELECT TOP (20) u.user_id, u.full_name, SUM(t.amount) AS xu_kiem_duoc
FROM xu_transactions t
JOIN users u ON u.user_id = t.user_id
WHERE t.txn_type IN ('EARN', 'BONUS')
  AND u.account_status = 'ACTIVE'
  AND u.system_role = 'VIEWER'
  AND t.created_at >= DATEADD(DAY, -30, SYSDATETIME())
GROUP BY u.user_id, u.full_name
ORDER BY xu_kiem_duoc DESC, u.user_id;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
GO
