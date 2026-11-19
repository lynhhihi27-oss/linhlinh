USE youtube_xu;
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;
GO

IF COL_LENGTH('dbo.redemptions', 'status_reason') IS NULL
    ALTER TABLE dbo.redemptions ADD status_reason NVARCHAR(500) NULL;
GO

COMMIT TRANSACTION;
GO
