-- =====================================================================
-- KIỂM THỬ RÀNG BUỘC, TRANSACTION VÀ TOÀN VẸN DỮ LIỆU TRÊN SQL SERVER
-- Mọi thao tác ghi đều nằm trong transaction và được ROLLBACK, không để lại dữ liệu.
--
-- Chạy:
--   sqlcmd -S ".\SQLEXPRESS" -E -I -b -f i:65001 -i ".\tests\sql\kiem-thu-rang-buoc.sql"
-- hoặc mở trong SSMS và chạy toàn bộ.
--
-- Kết quả: PASS / FAIL / WARN / SKIP. Chỉ FAIL làm script kết thúc với lỗi.
--  * WARN: dữ liệu hiện có không đối soát được (cần xem, không phải lỗi ràng buộc).
--  * SKIP: chưa có bảng của Sprint 5.
--
-- Yêu cầu: đã có schema (youtube_xu_database.sql) và cột request_key (migration 20261022).
-- Giới hạn: đây là kiểm thử ở mức SQL, không thay thế test API. Các tình huống chạy đồng thời
-- (hai request đổi quà cùng lúc) cần kiểm thử ở tầng ứng dụng.
-- =====================================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

USE youtube_xu;
GO

IF OBJECT_ID('tempdb..#kq') IS NOT NULL DROP TABLE #kq;
CREATE TABLE #kq (
    ma       VARCHAR(10)   NOT NULL,
    mo_ta    NVARCHAR(200) NOT NULL,
    ket_qua  VARCHAR(10)   NOT NULL,
    chi_tiet NVARCHAR(500) NULL
);
GO

-- ---------------------------------------------------------------------
-- PHẦN 1: RÀNG BUỘC TRÊN SCHEMA HIỆN CÓ
-- ---------------------------------------------------------------------
DECLARE @viewer INT = (SELECT TOP 1 user_id FROM users WHERE system_role = 'VIEWER' AND account_status = 'ACTIVE' ORDER BY user_id);
DECLARE @adv    INT = (SELECT TOP 1 user_id FROM users WHERE system_role = 'ADVERTISER' ORDER BY user_id);
DECLARE @cat    INT = (SELECT TOP 1 category_id FROM ad_categories ORDER BY category_id);
DECLARE @ad     INT = (SELECT TOP 1 ad_id FROM ads ORDER BY ad_id);
DECLARE @reward INT = (SELECT TOP 1 reward_id FROM rewards ORDER BY reward_id);

IF @viewer IS NULL OR @adv IS NULL OR @cat IS NULL OR @ad IS NULL OR @reward IS NULL
BEGIN
    RAISERROR(N'Thiếu dữ liệu nền (users, ad_categories, ads, rewards). Chạy script khởi tạo trước.', 16, 1);
    RETURN;
END

-- DI-01: UNIQUE (user_id, ad_id, view_date) chặn xem lặp trong ngày
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO ad_views (user_id, ad_id, view_token, view_date) VALUES (@viewer, @ad, 'tmp-di01-a', '2099-01-01');
    INSERT INTO ad_views (user_id, ad_id, view_token, view_date) VALUES (@viewer, @ad, 'tmp-di01-b', '2099-01-01');
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-01', N'Xem lặp cùng ngày bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-01', N'Xem lặp cùng ngày bị chặn',
        CASE WHEN ERROR_NUMBER() = 2627 AND ERROR_MESSAGE() LIKE '%uq_user_ad_day%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-02: view_token trùng bị chặn (hai ngày khác nhau để chỉ token gây lỗi)
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO ad_views (user_id, ad_id, view_token, view_date) VALUES (@viewer, @ad, 'tmp-di02', '2099-01-01');
    INSERT INTO ad_views (user_id, ad_id, view_token, view_date) VALUES (@viewer, @ad, 'tmp-di02', '2099-01-02');
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-02', N'view_token trùng bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-02', N'view_token trùng bị chặn',
        CASE WHEN ERROR_NUMBER() = 2627 AND ERROR_MESSAGE() LIKE '%tmp-di02%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-03: xu_balance âm bị chặn
BEGIN TRY
    BEGIN TRAN;
    UPDATE users SET xu_balance = -1 WHERE user_id = @viewer;
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-03', N'xu_balance âm bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-03', N'xu_balance âm bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%chk_balance%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-04a: spent_xu vượt budget_xu bị chặn
BEGIN TRY
    BEGIN TRAN;
    UPDATE ads SET spent_xu = budget_xu + 1 WHERE ad_id = @ad;
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04a', N'spent_xu > budget_xu bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04a', N'spent_xu > budget_xu bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%chk_budget%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-04b: end_date trước start_date bị chặn
BEGIN TRY
    BEGIN TRAN;
    UPDATE ads SET end_date = DATEADD(DAY, -1, start_date) WHERE ad_id = @ad;
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04b', N'end_date < start_date bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04b', N'end_date < start_date bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%chk_dates%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-04c: duration_sec ngoài 5-60 bị chặn
BEGIN TRY
    BEGIN TRAN;
    UPDATE ads SET duration_sec = 4 WHERE ad_id = @ad;
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04c', N'duration_sec ngoài 5-60 bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-04c', N'duration_sec ngoài 5-60 bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%chk_duration%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-05: khóa ngoại advertiser_id không tồn tại bị chặn
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO ads (advertiser_id, category_id, title, video_url, duration_sec, reward_xu, budget_xu, start_date, end_date)
    VALUES (-1, @cat, N'tmp', 'https://example.com/tmp', 30, 10, 100, '2099-01-01', '2099-01-31');
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-05', N'Khóa ngoại advertiser_id sai bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-05', N'Khóa ngoại advertiser_id sai bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%fk_ads_advertiser%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-06a: status chiến dịch ngoài danh sách bị chặn
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO ads (advertiser_id, category_id, title, video_url, duration_sec, reward_xu, budget_xu, start_date, end_date, status)
    VALUES (@adv, @cat, N'tmp', 'https://example.com/tmp', 30, 10, 100, '2099-01-01', '2099-01-31', 'XYZ');
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-06a', N'ads.status ngoài danh sách bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-06a', N'ads.status ngoài danh sách bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%CHECK constraint%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- DI-06b: txn_type ngoài danh sách bị chặn
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO xu_transactions (user_id, txn_type, amount, balance_after) VALUES (@viewer, 'XYZ', 1, 1);
    ROLLBACK;
    INSERT INTO #kq VALUES ('DI-06b', N'xu_transactions.txn_type ngoài danh sách bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('DI-06b', N'xu_transactions.txn_type ngoài danh sách bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%CHECK constraint%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- TX-02 (mức SQL): tồn kho âm bị chặn, là lưới an toàn khi hai request đổi quà trùng nhau
BEGIN TRY
    BEGIN TRAN;
    UPDATE rewards SET stock_qty = -1 WHERE reward_id = @reward;
    ROLLBACK;
    INSERT INTO #kq VALUES ('TX-02', N'stock_qty âm bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('TX-02', N'stock_qty âm bị chặn',
        CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%chk_cost%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- TX-04 (mức SQL): request_key trùng bị chặn, nền tảng của chống xử lý trùng yêu cầu đổi quà
BEGIN TRY
    BEGIN TRAN;
    INSERT INTO redemptions (user_id, reward_id, request_key, xu_spent) VALUES (@viewer, @reward, 'tmp-key-tx04', 1);
    INSERT INTO redemptions (user_id, reward_id, request_key, xu_spent) VALUES (@viewer, @reward, 'tmp-key-tx04', 1);
    ROLLBACK;
    INSERT INTO #kq VALUES ('TX-04', N'request_key trùng bị chặn', 'FAIL', N'Không có lỗi. Kiểm tra unique index uq_redemptions_request_key');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO #kq VALUES ('TX-04', N'request_key trùng bị chặn',
        CASE WHEN ERROR_NUMBER() = 2601 AND ERROR_MESSAGE() LIKE '%uq_redemptions_request_key%' THEN 'PASS' ELSE 'FAIL' END,
        N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
END CATCH;

-- TX-06 (mức SQL): lỗi giữa chừng thì rollback, số dư không đổi
DECLARE @truoc INT = (SELECT xu_balance FROM users WHERE user_id = @viewer);
BEGIN TRY
    BEGIN TRAN;
    UPDATE users SET xu_balance = xu_balance + 10 WHERE user_id = @viewer;
    INSERT INTO xu_transactions (user_id, txn_type, amount, balance_after) VALUES (@viewer, 'XYZ', 10, 0); -- cố ý vi phạm CHECK
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
END CATCH;
DECLARE @sau INT = (SELECT xu_balance FROM users WHERE user_id = @viewer);
INSERT INTO #kq VALUES ('TX-06', N'Lỗi giữa transaction thì rollback, số dư không đổi (mô phỏng ở mức SQL)',
    CASE WHEN @truoc = @sau THEN 'PASS' ELSE 'FAIL' END,
    N'Số dư trước ' + CAST(@truoc AS NVARCHAR(20)) + N', sau ' + CAST(@sau AS NVARCHAR(20)));

-- DI-07: số dư người dùng khớp dòng cuối của sổ cái (WARN nếu lệch, vì dữ liệu mẫu có thể chưa đối soát)
DECLARE @lechSoDu INT = (
    SELECT COUNT(*)
    FROM users u
    OUTER APPLY (
        SELECT TOP 1 balance_after FROM xu_transactions t
        WHERE t.user_id = u.user_id ORDER BY t.created_at DESC, t.txn_id DESC
    ) l
    WHERE (l.balance_after IS NULL AND u.xu_balance <> 0) OR l.balance_after <> u.xu_balance);
INSERT INTO #kq VALUES ('DI-07', N'Số dư khớp sổ cái xu_transactions',
    CASE WHEN @lechSoDu = 0 THEN 'PASS' ELSE 'WARN' END,
    CAST(@lechSoDu AS NVARCHAR(10)) + N' tài khoản lệch hoặc chưa có dòng sổ cái');

-- DI-08: spent_xu khớp tổng reward_xu của lượt xem hoàn tất (WARN nếu lệch)
DECLARE @lechNganSach INT = (
    SELECT COUNT(*) FROM (
        SELECT a.ad_id
        FROM ads a
        LEFT JOIN ad_views v ON v.ad_id = a.ad_id
        GROUP BY a.ad_id, a.spent_xu
        HAVING a.spent_xu <> ISNULL(SUM(CASE WHEN v.view_status = 'COMPLETED' THEN v.reward_xu END), 0)
    ) x);
INSERT INTO #kq VALUES ('DI-08', N'spent_xu khớp tổng từ ad_views hoàn tất',
    CASE WHEN @lechNganSach = 0 THEN 'PASS' ELSE 'WARN' END,
    CAST(@lechNganSach AS NVARCHAR(10)) + N' chiến dịch lệch');
GO

-- ---------------------------------------------------------------------
-- PHẦN 2: BẢNG SPRINT 5 (tách batch riêng. Nếu tên bảng/cột trong migration của bạn
-- khác với 20261112_sprint5_add_tables.sql thì sửa phần này cho khớp)
-- ---------------------------------------------------------------------
DECLARE @viewer INT = (SELECT TOP 1 user_id FROM users WHERE system_role = 'VIEWER' AND account_status = 'ACTIVE' ORDER BY user_id);

-- DI-09: nhận thưởng nhiệm vụ hai lần trong một ngày bị chặn
IF OBJECT_ID(N'user_daily_tasks', N'U') IS NULL OR OBJECT_ID(N'daily_tasks', N'U') IS NULL
    INSERT INTO #kq VALUES ('DI-09', N'Nhiệm vụ: một dòng mỗi người, mỗi nhiệm vụ, mỗi ngày', 'SKIP', N'Chưa có bảng nhiệm vụ');
ELSE
BEGIN
    BEGIN TRY
        BEGIN TRAN;
        INSERT INTO daily_tasks (task_code, title, task_type, target_count, reward_xu) VALUES ('TMP_TEST', N'tmp', 'LOGIN', 1, 1);
        DECLARE @task INT = SCOPE_IDENTITY();
        INSERT INTO user_daily_tasks (user_id, task_id, task_date) VALUES (@viewer, @task, '2099-01-01');
        INSERT INTO user_daily_tasks (user_id, task_id, task_date) VALUES (@viewer, @task, '2099-01-01');
        ROLLBACK;
        INSERT INTO #kq VALUES ('DI-09', N'Nhiệm vụ: một dòng mỗi người, mỗi nhiệm vụ, mỗi ngày', 'FAIL', N'Không có lỗi nào được ném ra');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT INTO #kq VALUES ('DI-09', N'Nhiệm vụ: một dòng mỗi người, mỗi nhiệm vụ, mỗi ngày',
            CASE WHEN ERROR_NUMBER() = 2627 AND ERROR_MESSAGE() LIKE '%uq_user_task_day%' THEN 'PASS' ELSE 'FAIL' END,
            N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
    END CATCH;
END

-- DI-10: loại thông báo ngoài danh sách bị chặn
IF OBJECT_ID(N'notifications', N'U') IS NULL
    INSERT INTO #kq VALUES ('DI-10', N'notifications.notification_type ngoài danh sách bị chặn', 'SKIP', N'Chưa có bảng notifications');
ELSE
BEGIN
    BEGIN TRY
        BEGIN TRAN;
        INSERT INTO notifications (user_id, notification_type, title, message) VALUES (@viewer, 'XYZ', N'tmp', N'tmp');
        ROLLBACK;
        INSERT INTO #kq VALUES ('DI-10', N'notifications.notification_type ngoài danh sách bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT INTO #kq VALUES ('DI-10', N'notifications.notification_type ngoài danh sách bị chặn',
            CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%CHECK constraint%' THEN 'PASS' ELSE 'FAIL' END,
            N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
    END CATCH;
END

-- DI-11: trạng thái yêu cầu hỗ trợ ngoài danh sách bị chặn
IF OBJECT_ID(N'support_tickets', N'U') IS NULL
    INSERT INTO #kq VALUES ('DI-11', N'support_tickets.status ngoài danh sách bị chặn', 'SKIP', N'Chưa có bảng support_tickets');
ELSE
BEGIN
    BEGIN TRY
        BEGIN TRAN;
        INSERT INTO support_tickets (user_id, category, title, content, status) VALUES (@viewer, 'OTHER', N'tmp', N'tmp', 'XYZ');
        ROLLBACK;
        INSERT INTO #kq VALUES ('DI-11', N'support_tickets.status ngoài danh sách bị chặn', 'FAIL', N'Không có lỗi nào được ném ra');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT INTO #kq VALUES ('DI-11', N'support_tickets.status ngoài danh sách bị chặn',
            CASE WHEN ERROR_NUMBER() = 547 AND ERROR_MESSAGE() LIKE '%CHECK constraint%' THEN 'PASS' ELSE 'FAIL' END,
            N'Lỗi ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + N': ' + LEFT(ERROR_MESSAGE(), 300));
    END CATCH;
END
GO

-- ---------------------------------------------------------------------
-- TỔNG HỢP
-- ---------------------------------------------------------------------
SELECT ma, ket_qua, mo_ta, chi_tiet FROM #kq ORDER BY ma;
SELECT ket_qua, COUNT(*) AS so_luong FROM #kq GROUP BY ket_qua;

IF NOT EXISTS (SELECT 1 FROM #kq)
    RAISERROR(N'Không có kết quả nào được ghi. Kiểm tra dữ liệu nền ở phần 1.', 16, 1);
IF EXISTS (SELECT 1 FROM #kq WHERE ket_qua = 'FAIL')
    RAISERROR(N'Có test FAIL. Xem bảng kết quả ở trên.', 16, 1);
GO
