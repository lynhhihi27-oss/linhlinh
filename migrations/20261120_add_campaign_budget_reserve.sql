USE youtube_xu;
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;
GO

IF COL_LENGTH('dbo.ads', 'reserved_xu') IS NULL
    ALTER TABLE dbo.ads
    ADD reserved_xu INT NOT NULL
        CONSTRAINT df_ads_reserved_xu DEFAULT (0) WITH VALUES;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.ads')
      AND name = 'chk_ads_budget_reservation'
)
    ALTER TABLE dbo.ads WITH CHECK
    ADD CONSTRAINT chk_ads_budget_reservation CHECK (
        spent_xu >= 0 AND reserved_xu >= 0 AND spent_xu + reserved_xu <= budget_xu
    );
GO

COMMIT TRANSACTION;
GO
