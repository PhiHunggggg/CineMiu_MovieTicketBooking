USE [BaseCoreBookingMovie];
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.roles', 'created_at') IS NULL
    ALTER TABLE dbo.roles
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_roles_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.roles', 'updated_at') IS NULL
    ALTER TABLE dbo.roles ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.genres', 'description') IS NULL
    ALTER TABLE dbo.genres
        ADD description nvarchar(max) NOT NULL
            CONSTRAINT DF_genres_description DEFAULT N'' WITH VALUES;

IF COL_LENGTH('dbo.genres', 'created_at') IS NULL
    ALTER TABLE dbo.genres
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_genres_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.genres', 'updated_at') IS NULL
    ALTER TABLE dbo.genres ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.seat_types', 'created_at') IS NULL
    ALTER TABLE dbo.seat_types
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_seat_types_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.seat_types', 'updated_at') IS NULL
    ALTER TABLE dbo.seat_types ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.cinemas', 'created_at') IS NULL
    ALTER TABLE dbo.cinemas
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_cinemas_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.cinemas', 'updated_at') IS NULL
    ALTER TABLE dbo.cinemas ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.halls', 'created_at') IS NULL
    ALTER TABLE dbo.halls
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_halls_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.halls', 'updated_at') IS NULL
    ALTER TABLE dbo.halls ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.seats', 'created_at') IS NULL
    ALTER TABLE dbo.seats
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_seats_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.seats', 'updated_at') IS NULL
    ALTER TABLE dbo.seats ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.concession_categories', 'created_at') IS NULL
    ALTER TABLE dbo.concession_categories
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_concession_categories_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.concession_categories', 'updated_at') IS NULL
    ALTER TABLE dbo.concession_categories ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.concession_items', 'created_at') IS NULL
    ALTER TABLE dbo.concession_items
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_concession_items_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.concession_items', 'updated_at') IS NULL
    ALTER TABLE dbo.concession_items ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.promotions', 'created_at') IS NULL
    ALTER TABLE dbo.promotions
        ADD created_at datetime2 NOT NULL
            CONSTRAINT DF_promotions_created_at DEFAULT SYSUTCDATETIME() WITH VALUES;

IF COL_LENGTH('dbo.promotions', 'updated_at') IS NULL
    ALTER TABLE dbo.promotions ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.showtimes', 'updated_at') IS NULL
    ALTER TABLE dbo.showtimes ADD updated_at datetime2 NULL;

IF COL_LENGTH('dbo.users', 'cinema_id') IS NULL
    ALTER TABLE dbo.users ADD cinema_id int NULL;

IF OBJECT_ID('dbo.member_tiers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.member_tiers
    (
        tier_id int IDENTITY(1, 1) NOT NULL
            CONSTRAINT PK_member_tiers PRIMARY KEY,
        tier_name nvarchar(max) NOT NULL,
        min_points int NOT NULL,
        discount_percent decimal(5, 2) NOT NULL,
        benefits nvarchar(max) NULL
    );

    CREATE INDEX IX_member_tiers_min_points
        ON dbo.member_tiers(min_points);
END;

IF OBJECT_ID('dbo.user_memberships', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_memberships
    (
        user_id int NOT NULL
            CONSTRAINT PK_user_memberships PRIMARY KEY,
        total_points int NOT NULL,
        tier_id int NOT NULL,
        updated_at datetime2 NOT NULL
    );

    CREATE INDEX IX_user_memberships_tier_id
        ON dbo.user_memberships(tier_id);
END;

IF OBJECT_ID('dbo.point_transactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.point_transactions
    (
        transaction_id int IDENTITY(1, 1) NOT NULL
            CONSTRAINT PK_point_transactions PRIMARY KEY,
        user_id int NOT NULL,
        booking_id int NULL,
        points int NOT NULL,
        transaction_type nvarchar(max) NOT NULL,
        description nvarchar(max) NULL,
        created_at datetime2 NOT NULL
    );

    CREATE INDEX IX_point_transactions_user_id
        ON dbo.point_transactions(user_id);

    CREATE INDEX IX_point_transactions_booking_id
        ON dbo.point_transactions(booking_id);
END;

COMMIT TRANSACTION;
