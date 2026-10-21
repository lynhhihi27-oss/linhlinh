USE youtube_xu;
GO

IF COL_LENGTH('dbo.redemptions', 'request_key') IS NULL
BEGIN
    ALTER TABLE dbo.redemptions ADD request_key VARCHAR(36) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.redemptions')
      AND name = 'uq_redemptions_request_key'
)
BEGIN
    CREATE UNIQUE INDEX uq_redemptions_request_key
        ON dbo.redemptions(request_key)
        WHERE request_key IS NOT NULL;
END
GO
