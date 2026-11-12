-- =====================================================================
-- MIGRATION SPRINT 5 (2/2): INDEX VÀ RÀNG BUỘC CHO CÁC BẢNG HIỆN CÓ
-- Chạy lại an toàn. Không DROP, không xóa dữ liệu.
--
-- Chạy:
--   sqlcmd -S ".\SQLEXPRESS" -E -I -b -f i:65001 -i ".\migrations\20261112_sprint5_indexes_and_constraints.sql"
--
-- Quy tắc:
--  * Index chỉ tạo nếu chưa có. Đo trước/sau rồi mới giữ (xem tests/sql/do-hieu-nang.sql).
--  * Mỗi CHECK chỉ được thêm khi dữ liệu hiện có không vi phạm. Nếu có dòng vi phạm,
--    script in cảnh báo kèm câu SELECT tìm dòng đó và bỏ qua ràng buộc, không làm hỏng migration.
--  * Phần created_at: các dòng đang NULL được gán thời điểm chạy migration trước khi đặt NOT NULL.
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

USE youtube_xu;
GO

-- 1. Index -------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_ads_advertiser' AND object_id = OBJECT_ID(N'ads'))
    CREATE INDEX idx_ads_advertiser ON ads(advertiser_id, status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_ads_category' AND object_id = OBJECT_ID(N'ads'))
    CREATE INDEX idx_ads_category ON ads(category_id, status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_targeting_ad' AND object_id = OBJECT_ID(N'ad_targeting'))
    CREATE INDEX idx_targeting_ad ON ad_targeting(ad_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_views_ad' AND object_id = OBJECT_ID(N'ad_views'))
    CREATE INDEX idx_views_ad ON ad_views(ad_id, view_status, view_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_txn_type_time' AND object_id = OBJECT_ID(N'xu_transactions'))
    CREATE INDEX idx_txn_type_time ON xu_transactions(txn_type, created_at) INCLUDE (user_id, amount);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_txn_view' AND object_id = OBJECT_ID(N'xu_transactions'))
    CREATE INDEX idx_txn_view ON xu_transactions(view_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_txn_redemption' AND object_id = OBJECT_ID(N'xu_transactions'))
    CREATE INDEX idx_txn_redemption ON xu_transactions(redemption_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_redemptions_status' AND object_id = OBJECT_ID(N'redemptions'))
    CREATE INDEX idx_redemptions_status ON redemptions(status, requested_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_redemptions_reward' AND object_id = OBJECT_ID(N'redemptions'))
    CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_users_referred_by' AND object_id = OBJECT_ID(N'users'))
    CREATE INDEX idx_users_referred_by ON users(referred_by);
GO

-- 2. Ràng buộc CHECK (chỉ thêm khi dữ liệu hiện có hợp lệ) -------------
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_ads_reward' AND parent_object_id = OBJECT_ID(N'ads'))
BEGIN
    IF EXISTS (SELECT 1 FROM ads WHERE reward_xu <= 0 OR reward_xu > budget_xu)
        PRINT N'BỎ QUA chk_ads_reward. Tìm dòng vi phạm: SELECT * FROM ads WHERE reward_xu <= 0 OR reward_xu > budget_xu';
    ELSE
        ALTER TABLE ads ADD CONSTRAINT chk_ads_reward CHECK (reward_xu > 0 AND reward_xu <= budget_xu);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_ads_spent' AND parent_object_id = OBJECT_ID(N'ads'))
BEGIN
    IF EXISTS (SELECT 1 FROM ads WHERE spent_xu < 0)
        PRINT N'BỎ QUA chk_ads_spent. Tìm dòng vi phạm: SELECT * FROM ads WHERE spent_xu < 0';
    ELSE
        ALTER TABLE ads ADD CONSTRAINT chk_ads_spent CHECK (spent_xu >= 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_targeting_age' AND parent_object_id = OBJECT_ID(N'ad_targeting'))
BEGIN
    IF EXISTS (SELECT 1 FROM ad_targeting
               WHERE (age_from IS NOT NULL AND age_from NOT BETWEEN 16 AND 120)
                  OR (age_to IS NOT NULL AND age_to NOT BETWEEN 16 AND 120)
                  OR (age_from IS NOT NULL AND age_to IS NOT NULL AND age_from > age_to))
        PRINT N'BỎ QUA chk_targeting_age. Tìm dòng vi phạm: tuổi ngoài 16-120 hoặc age_from > age_to trong ad_targeting';
    ELSE
        ALTER TABLE ad_targeting ADD CONSTRAINT chk_targeting_age CHECK (
            (age_from IS NULL OR age_from BETWEEN 16 AND 120)
            AND (age_to IS NULL OR age_to BETWEEN 16 AND 120)
            AND (age_from IS NULL OR age_to IS NULL OR age_from <= age_to));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_rewards_face' AND parent_object_id = OBJECT_ID(N'rewards'))
BEGIN
    IF EXISTS (SELECT 1 FROM rewards WHERE face_value_vnd <= 0)
        PRINT N'BỎ QUA chk_rewards_face. Tìm dòng vi phạm: SELECT * FROM rewards WHERE face_value_vnd <= 0';
    ELSE
        ALTER TABLE rewards ADD CONSTRAINT chk_rewards_face CHECK (face_value_vnd > 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_redemptions_xu' AND parent_object_id = OBJECT_ID(N'redemptions'))
BEGIN
    IF EXISTS (SELECT 1 FROM redemptions WHERE xu_spent <= 0)
        PRINT N'BỎ QUA chk_redemptions_xu. Tìm dòng vi phạm: SELECT * FROM redemptions WHERE xu_spent <= 0';
    ELSE
        ALTER TABLE redemptions ADD CONSTRAINT chk_redemptions_xu CHECK (xu_spent > 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'chk_views_nonneg' AND parent_object_id = OBJECT_ID(N'ad_views'))
BEGIN
    IF EXISTS (SELECT 1 FROM ad_views WHERE watched_seconds < 0 OR reward_xu < 0)
        PRINT N'BỎ QUA chk_views_nonneg. Tìm dòng vi phạm: SELECT * FROM ad_views WHERE watched_seconds < 0 OR reward_xu < 0';
    ELSE
        ALTER TABLE ad_views ADD CONSTRAINT chk_views_nonneg CHECK (watched_seconds >= 0 AND reward_xu >= 0);
END
GO

-- 3. created_at: thống nhất NOT NULL như các bảng khác -----------------
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = N'created_at' AND is_nullable = 1)
BEGIN
    UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    ALTER TABLE users ALTER COLUMN created_at DATETIME NOT NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ads') AND name = N'created_at' AND is_nullable = 1)
BEGIN
    UPDATE ads SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    ALTER TABLE ads ALTER COLUMN created_at DATETIME NOT NULL;
END
GO

PRINT N'Hoàn tất migration Sprint 5 (2/2): index và ràng buộc. Kiểm tra các dòng "BỎ QUA" (nếu có) ở trên.';
GO
