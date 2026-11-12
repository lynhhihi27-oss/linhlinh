-- =====================================================================
-- MIGRATION SPRINT 5 (1/2): BẢNG CHO THÔNG BÁO, NHIỆM VỤ HẰNG NGÀY, HỖ TRỢ
-- Chạy lại an toàn (IF NOT EXISTS). Không DROP, không xóa hay sửa dữ liệu.
--
-- Chạy:
--   sqlcmd -S ".\SQLEXPRESS" -E -I -b -f i:65001 -i ".\migrations\20261112_sprint5_add_tables.sql"
--
-- Lưu ý trước khi chạy:
--  * Danh sách giá trị trong CHECK (loại thông báo, loại nhiệm vụ, nhóm hỗ trợ)
--    là đề xuất. Sửa cho khớp với code của TV2/TV3/TV4 trước khi merge.
--  * Tên bảng và cột theo snake_case giống schema hiện có.
--  * Không thêm dữ liệu mẫu cho daily_tasks vì mức thưởng là quyết định của nhóm.
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

USE youtube_xu;
GO

-- 1. Thông báo ---------------------------------------------------------
IF OBJECT_ID(N'notifications', N'U') IS NULL
BEGIN
    CREATE TABLE notifications (
        notification_id   BIGINT IDENTITY(1,1) NOT NULL,
        user_id           INT NOT NULL,
        notification_type VARCHAR(30) NOT NULL,
        title             NVARCHAR(150) NOT NULL,
        message           NVARCHAR(500) NOT NULL,
        is_read           BIT NOT NULL CONSTRAINT df_notifications_is_read DEFAULT 0,
        created_at        DATETIME NOT NULL CONSTRAINT df_notifications_created DEFAULT CURRENT_TIMESTAMP,
        read_at           DATETIME NULL,
        CONSTRAINT pk_notifications PRIMARY KEY (notification_id),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id),
        CONSTRAINT chk_notifications_type CHECK (notification_type IN (
            'XU_EARNED', 'REDEMPTION_CREATED', 'REDEMPTION_APPROVED',
            'REDEMPTION_REJECTED', 'NEW_TASK', 'SUPPORT_REPLY', 'SYSTEM'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_notifications_user' AND object_id = OBJECT_ID(N'notifications'))
    CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
GO

-- 2. Nhiệm vụ hằng ngày ------------------------------------------------
IF OBJECT_ID(N'daily_tasks', N'U') IS NULL
BEGIN
    CREATE TABLE daily_tasks (
        task_id      INT IDENTITY(1,1) NOT NULL,
        task_code    VARCHAR(30) NOT NULL,
        title        NVARCHAR(150) NOT NULL,
        description  NVARCHAR(255) NULL,
        task_type    VARCHAR(20) NOT NULL,
        target_count INT NOT NULL,
        reward_xu    INT NOT NULL,
        is_active    BIT NOT NULL CONSTRAINT df_daily_tasks_active DEFAULT 1,
        CONSTRAINT pk_daily_tasks PRIMARY KEY (task_id),
        CONSTRAINT uq_daily_tasks_code UNIQUE (task_code),
        CONSTRAINT chk_daily_tasks_type CHECK (task_type IN ('LOGIN', 'WATCH_ADS', 'CHECK_IN')),
        CONSTRAINT chk_daily_tasks_target CHECK (target_count > 0),
        CONSTRAINT chk_daily_tasks_reward CHECK (reward_xu > 0)
    );
END
GO

-- Mỗi người, mỗi nhiệm vụ, mỗi ngày chỉ có một dòng: UNIQUE chặn nhận thưởng hai lần.
-- txn_id trỏ tới dòng sổ cái khi đã nhận thưởng (loại giao dịch do nhóm chốt, ví dụ 'BONUS').
IF OBJECT_ID(N'user_daily_tasks', N'U') IS NULL
BEGIN
    CREATE TABLE user_daily_tasks (
        user_task_id BIGINT IDENTITY(1,1) NOT NULL,
        user_id      INT NOT NULL,
        task_id      INT NOT NULL,
        task_date    DATE NOT NULL,
        progress     INT NOT NULL CONSTRAINT df_user_daily_tasks_progress DEFAULT 0,
        status       VARCHAR(20) NOT NULL CONSTRAINT df_user_daily_tasks_status DEFAULT 'NOT_STARTED',
        claimed_at   DATETIME NULL,
        txn_id       BIGINT NULL,
        CONSTRAINT pk_user_daily_tasks PRIMARY KEY (user_task_id),
        CONSTRAINT uq_user_task_day UNIQUE (user_id, task_id, task_date),
        CONSTRAINT fk_user_daily_tasks_user FOREIGN KEY (user_id) REFERENCES users(user_id),
        CONSTRAINT fk_user_daily_tasks_task FOREIGN KEY (task_id) REFERENCES daily_tasks(task_id),
        CONSTRAINT fk_user_daily_tasks_txn FOREIGN KEY (txn_id) REFERENCES xu_transactions(txn_id),
        CONSTRAINT chk_user_daily_tasks_progress CHECK (progress >= 0),
        CONSTRAINT chk_user_daily_tasks_status CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED')),
        CONSTRAINT chk_user_daily_tasks_claim CHECK (
            (status = 'CLAIMED' AND claimed_at IS NOT NULL) OR (status <> 'CLAIMED' AND claimed_at IS NULL))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_user_daily_tasks_task' AND object_id = OBJECT_ID(N'user_daily_tasks'))
    CREATE INDEX idx_user_daily_tasks_task ON user_daily_tasks(task_id);
GO

-- 3. Trung tâm hỗ trợ --------------------------------------------------
-- txn_id và redemption_id là mã giao dịch / đơn đổi quà người dùng gửi kèm (nếu có).
-- Backend phải kiểm tra mã đó thuộc về chính người gửi trước khi lưu.
IF OBJECT_ID(N'support_tickets', N'U') IS NULL
BEGIN
    CREATE TABLE support_tickets (
        ticket_id     INT IDENTITY(1,1) NOT NULL,
        user_id       INT NOT NULL,
        category      VARCHAR(20) NOT NULL,
        title         NVARCHAR(150) NOT NULL,
        content       NVARCHAR(2000) NOT NULL,
        txn_id        BIGINT NULL,
        redemption_id INT NULL,
        status        VARCHAR(20) NOT NULL CONSTRAINT df_support_tickets_status DEFAULT 'PENDING',
        created_at    DATETIME NOT NULL CONSTRAINT df_support_tickets_created DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME NOT NULL CONSTRAINT df_support_tickets_updated DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_support_tickets PRIMARY KEY (ticket_id),
        CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES users(user_id),
        CONSTRAINT fk_support_tickets_txn FOREIGN KEY (txn_id) REFERENCES xu_transactions(txn_id),
        CONSTRAINT fk_support_tickets_redemption FOREIGN KEY (redemption_id) REFERENCES redemptions(redemption_id),
        CONSTRAINT chk_support_tickets_category CHECK (category IN ('XU_ERROR', 'REDEMPTION_ERROR', 'ACCOUNT', 'ADS', 'OTHER')),
        CONSTRAINT chk_support_tickets_status CHECK (status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_support_tickets_user' AND object_id = OBJECT_ID(N'support_tickets'))
    CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_support_tickets_status' AND object_id = OBJECT_ID(N'support_tickets'))
    CREATE INDEX idx_support_tickets_status ON support_tickets(status, created_at DESC);
GO

IF OBJECT_ID(N'support_replies', N'U') IS NULL
BEGIN
    CREATE TABLE support_replies (
        reply_id   INT IDENTITY(1,1) NOT NULL,
        ticket_id  INT NOT NULL,
        author_id  INT NOT NULL,
        message    NVARCHAR(2000) NOT NULL,
        created_at DATETIME NOT NULL CONSTRAINT df_support_replies_created DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_support_replies PRIMARY KEY (reply_id),
        CONSTRAINT fk_support_replies_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
        CONSTRAINT fk_support_replies_author FOREIGN KEY (author_id) REFERENCES users(user_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_support_replies_ticket' AND object_id = OBJECT_ID(N'support_replies'))
    CREATE INDEX idx_support_replies_ticket ON support_replies(ticket_id, created_at);
GO

PRINT N'Hoàn tất migration Sprint 5 (1/2): bảng thông báo, nhiệm vụ, hỗ trợ.';
GO
