USE youtube_xu;
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        NotificationID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserID INT NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        Message NVARCHAR(500) NOT NULL,
        Type VARCHAR(30) NOT NULL,
        IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserID) REFERENCES dbo.users(user_id)
    );
    CREATE INDEX IX_Notifications_User_Created
        ON dbo.Notifications(UserID, CreatedAt DESC);
END
GO

IF OBJECT_ID('dbo.DailyTasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DailyTasks (
        TaskID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TaskKey VARCHAR(50) NOT NULL UNIQUE,
        Title NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NOT NULL,
        RewardXu INT NOT NULL CHECK (RewardXu > 0),
        TaskType VARCHAR(30) NOT NULL CHECK (TaskType IN ('LOGIN', 'VALID_AD_VIEWS', 'DAILY_ATTENDANCE')),
        TargetCount INT NOT NULL CHECK (TargetCount > 0),
        IsActive BIT NOT NULL CONSTRAINT DF_DailyTasks_IsActive DEFAULT 1
    );

    CREATE TABLE dbo.UserDailyTasks (
        UserDailyTaskID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserID INT NOT NULL,
        TaskID INT NOT NULL,
        TaskDate DATE NOT NULL,
        Progress INT NOT NULL,
        ClaimedAt DATETIME2 NOT NULL CONSTRAINT DF_UserDailyTasks_ClaimedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_UserDailyTasks_Users FOREIGN KEY (UserID) REFERENCES dbo.users(user_id),
        CONSTRAINT FK_UserDailyTasks_Tasks FOREIGN KEY (TaskID) REFERENCES dbo.DailyTasks(TaskID),
        CONSTRAINT UQ_UserDailyTasks_User_Task_Date UNIQUE (UserID, TaskID, TaskDate)
    );

    CREATE TABLE dbo.TaskRewards (
        TaskRewardID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserDailyTaskID BIGINT NOT NULL UNIQUE,
        UserID INT NOT NULL,
        Amount INT NOT NULL CHECK (Amount > 0),
        TransactionID BIGINT NOT NULL UNIQUE,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TaskRewards_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_TaskRewards_UserDailyTask FOREIGN KEY (UserDailyTaskID) REFERENCES dbo.UserDailyTasks(UserDailyTaskID),
        CONSTRAINT FK_TaskRewards_Users FOREIGN KEY (UserID) REFERENCES dbo.users(user_id),
        CONSTRAINT FK_TaskRewards_Transactions FOREIGN KEY (TransactionID) REFERENCES dbo.xu_transactions(txn_id)
    );
    CREATE INDEX IX_UserDailyTasks_User_Date ON dbo.UserDailyTasks(UserID, TaskDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DailyTasks WHERE TaskKey = 'daily-login')
    INSERT INTO dbo.DailyTasks (TaskKey, Title, Description, RewardXu, TaskType, TargetCount)
    VALUES ('daily-login', N'Đăng nhập hằng ngày', N'Đăng nhập tài khoản để hoàn thành nhiệm vụ hôm nay.', 5, 'LOGIN', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DailyTasks WHERE TaskKey = 'valid-ad-one')
    INSERT INTO dbo.DailyTasks (TaskKey, Title, Description, RewardXu, TaskType, TargetCount)
    VALUES ('valid-ad-one', N'Xem quảng cáo hợp lệ', N'Hoàn thành 1 lượt xem quảng cáo đã được máy chủ xác minh.', 10, 'VALID_AD_VIEWS', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DailyTasks WHERE TaskKey = 'valid-ad-three')
    INSERT INTO dbo.DailyTasks (TaskKey, Title, Description, RewardXu, TaskType, TargetCount)
    VALUES ('valid-ad-three', N'Xem 3 quảng cáo hợp lệ', N'Hoàn thành 3 lượt xem quảng cáo đã được máy chủ xác minh.', 30, 'VALID_AD_VIEWS', 3);
IF NOT EXISTS (SELECT 1 FROM dbo.DailyTasks WHERE TaskKey = 'daily-attendance')
    INSERT INTO dbo.DailyTasks (TaskKey, Title, Description, RewardXu, TaskType, TargetCount)
    VALUES ('daily-attendance', N'Điểm danh hằng ngày', N'Điểm danh một lần trong ngày để duy trì hoạt động.', 5, 'DAILY_ATTENDANCE', 1);
GO

IF OBJECT_ID('dbo.SupportTickets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupportTickets (
        TicketID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserID INT NOT NULL,
        Category VARCHAR(30) NOT NULL CHECK (Category IN ('EARN_XU', 'REDEMPTION', 'ACCOUNT', 'AD', 'OTHER')),
        Subject NVARCHAR(150) NOT NULL,
        Description NVARCHAR(3000) NOT NULL,
        TransactionCode NVARCHAR(100) NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_SupportTickets_Status DEFAULT 'PENDING'
            CHECK (Status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED')),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SupportTickets_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SupportTickets_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SupportTickets_Users FOREIGN KEY (UserID) REFERENCES dbo.users(user_id)
    );
    CREATE INDEX IX_SupportTickets_User_Created ON dbo.SupportTickets(UserID, CreatedAt DESC);
    CREATE INDEX IX_SupportTickets_Status_Created ON dbo.SupportTickets(Status, CreatedAt DESC);

    CREATE TABLE dbo.SupportReplies (
        ReplyID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TicketID BIGINT NOT NULL,
        ResponderID INT NOT NULL,
        Message NVARCHAR(3000) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SupportReplies_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SupportReplies_Tickets FOREIGN KEY (TicketID) REFERENCES dbo.SupportTickets(TicketID),
        CONSTRAINT FK_SupportReplies_Users FOREIGN KEY (ResponderID) REFERENCES dbo.users(user_id)
    );
    CREATE INDEX IX_SupportReplies_Ticket_Created ON dbo.SupportReplies(TicketID, CreatedAt);
END
GO

IF OBJECT_ID('dbo.DailyTasks', 'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.Notifications WHERE Type = 'TASK_NEW')
BEGIN
    INSERT INTO dbo.Notifications (UserID, Title, Message, Type)
    SELECT user_id, N'Nhiệm vụ mới', N'Nhiệm vụ hằng ngày đã sẵn sàng. Hoàn thành nhiệm vụ hợp lệ để nhận Xu.', 'TASK_NEW'
    FROM dbo.users
    WHERE system_role = 'VIEWER' AND account_status = 'ACTIVE';
END
GO
