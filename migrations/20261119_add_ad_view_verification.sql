SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

USE youtube_xu;
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;
GO

IF COL_LENGTH('dbo.ad_views', 'verification_provider') IS NULL
    ALTER TABLE dbo.ad_views ADD verification_provider VARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.ad_views', 'verification_event_id') IS NULL
    ALTER TABLE dbo.ad_views ADD verification_event_id NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.ad_views', 'verified_at') IS NULL
    ALTER TABLE dbo.ad_views ADD verified_at DATETIME2 NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.ad_views')
      AND name = 'chk_ad_views_verification_fields'
)
    ALTER TABLE dbo.ad_views WITH CHECK
    ADD CONSTRAINT chk_ad_views_verification_fields CHECK (
        (verification_provider IS NULL AND verification_event_id IS NULL AND verified_at IS NULL)
        OR
        (verification_provider IS NOT NULL AND verification_event_id IS NOT NULL AND verified_at IS NOT NULL)
    );
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ad_views')
      AND name = 'uq_ad_views_provider_event'
)
    CREATE UNIQUE INDEX uq_ad_views_provider_event
        ON dbo.ad_views(verification_provider, verification_event_id)
        WHERE verification_provider IS NOT NULL AND verification_event_id IS NOT NULL;
GO

COMMIT TRANSACTION;
GO
