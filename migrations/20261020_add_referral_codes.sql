USE youtube_xu;
GO

IF COL_LENGTH('dbo.users', 'referral_code') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD referral_code VARCHAR(20) NULL;
END
GO

UPDATE dbo.users
SET referral_code = CONCAT('YX', RIGHT(REPLICATE('0', 8) + CONVERT(VARCHAR(8), user_id), 8))
WHERE referral_code IS NULL;
GO

ALTER TABLE dbo.users ALTER COLUMN referral_code VARCHAR(20) NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.users')
      AND name = 'uq_users_referral_code'
)
BEGIN
    CREATE UNIQUE INDEX uq_users_referral_code ON dbo.users(referral_code);
END
GO
