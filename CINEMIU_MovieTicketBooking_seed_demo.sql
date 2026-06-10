
USE [CINEMIU_MovieTicketBooking]
GO
SET NOCOUNT ON;
GO

/* =========================================================
   CINEMIU_MovieTicketBooking - DEMO SEED DATA
   Chạy sau khi đã tạo database/schema.
   Script có phần xóa dữ liệu demo cũ để chạy lại nhiều lần.
   ========================================================= */

BEGIN TRY
    BEGIN TRANSACTION;

    -- Tạm tắt kiểm tra khóa ngoại để làm sạch dữ liệu demo nếu đã chạy trước đó
    EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

    DELETE FROM [dbo].[seat_locks];
    DELETE FROM [dbo].[promo_usages];
    DELETE FROM [dbo].[booking_concessions];
    DELETE FROM [dbo].[payments];
    DELETE FROM [dbo].[tickets];
    DELETE FROM [dbo].[point_transactions];
    DELETE FROM [dbo].[bookings];
    DELETE FROM [dbo].[reviews];
    DELETE FROM [dbo].[notifications];
    DELETE FROM [dbo].[showtimes];
    DELETE FROM [dbo].[ticket_prices];
    DELETE FROM [dbo].[seats];
    DELETE FROM [dbo].[halls];
    DELETE FROM [dbo].[cinemas];
    DELETE FROM [dbo].[Chains];
    DELETE FROM [dbo].[movie_genres];
    DELETE FROM [dbo].[movies];
    DELETE FROM [dbo].[concession_items];
    DELETE FROM [dbo].[concession_categories];
    DELETE FROM [dbo].[promotions];
    DELETE FROM [dbo].[payment_methods];
    DELETE FROM [dbo].[user_memberships];
    DELETE FROM [dbo].[users];
    DELETE FROM [dbo].[member_tiers];
    DELETE FROM [dbo].[seat_types];
    DELETE FROM [dbo].[hall_types];
    DELETE FROM [dbo].[day_types];
    DELETE FROM [dbo].[genres];
    DELETE FROM [dbo].[countries];
    DELETE FROM [dbo].[roles];

    -- Reset identity
    IF OBJECT_ID('dbo.bookings') IS NOT NULL DBCC CHECKIDENT ('dbo.bookings', RESEED, 0);
    IF OBJECT_ID('dbo.booking_concessions') IS NOT NULL DBCC CHECKIDENT ('dbo.booking_concessions', RESEED, 0);
    IF OBJECT_ID('dbo.Chains') IS NOT NULL DBCC CHECKIDENT ('dbo.Chains', RESEED, 0);
    IF OBJECT_ID('dbo.cinemas') IS NOT NULL DBCC CHECKIDENT ('dbo.cinemas', RESEED, 0);
    IF OBJECT_ID('dbo.concession_items') IS NOT NULL DBCC CHECKIDENT ('dbo.concession_items', RESEED, 0);
    IF OBJECT_ID('dbo.countries') IS NOT NULL DBCC CHECKIDENT ('dbo.countries', RESEED, 0);
    IF OBJECT_ID('dbo.halls') IS NOT NULL DBCC CHECKIDENT ('dbo.halls', RESEED, 0);
    IF OBJECT_ID('dbo.member_tiers') IS NOT NULL DBCC CHECKIDENT ('dbo.member_tiers', RESEED, 0);
    IF OBJECT_ID('dbo.movies') IS NOT NULL DBCC CHECKIDENT ('dbo.movies', RESEED, 0);
    IF OBJECT_ID('dbo.notifications') IS NOT NULL DBCC CHECKIDENT ('dbo.notifications', RESEED, 0);
    IF OBJECT_ID('dbo.payments') IS NOT NULL DBCC CHECKIDENT ('dbo.payments', RESEED, 0);
    IF OBJECT_ID('dbo.point_transactions') IS NOT NULL DBCC CHECKIDENT ('dbo.point_transactions', RESEED, 0);
    IF OBJECT_ID('dbo.promo_usages') IS NOT NULL DBCC CHECKIDENT ('dbo.promo_usages', RESEED, 0);
    IF OBJECT_ID('dbo.promotions') IS NOT NULL DBCC CHECKIDENT ('dbo.promotions', RESEED, 0);
    IF OBJECT_ID('dbo.reviews') IS NOT NULL DBCC CHECKIDENT ('dbo.reviews', RESEED, 0);
    IF OBJECT_ID('dbo.seat_locks') IS NOT NULL DBCC CHECKIDENT ('dbo.seat_locks', RESEED, 0);
    IF OBJECT_ID('dbo.seats') IS NOT NULL DBCC CHECKIDENT ('dbo.seats', RESEED, 0);
    IF OBJECT_ID('dbo.showtimes') IS NOT NULL DBCC CHECKIDENT ('dbo.showtimes', RESEED, 0);
    IF OBJECT_ID('dbo.ticket_prices') IS NOT NULL DBCC CHECKIDENT ('dbo.ticket_prices', RESEED, 0);
    IF OBJECT_ID('dbo.tickets') IS NOT NULL DBCC CHECKIDENT ('dbo.tickets', RESEED, 0);
    IF OBJECT_ID('dbo.users') IS NOT NULL DBCC CHECKIDENT ('dbo.users', RESEED, 0);
    IF OBJECT_ID('dbo.user_memberships') IS NOT NULL DBCC CHECKIDENT ('dbo.user_memberships', RESEED, 0);

    ------------------------------------------------------------
    -- 1. Dữ liệu danh mục nền
    ------------------------------------------------------------
    INSERT INTO [dbo].[roles] ([role_id], [role_name], [description], [created_at], [updated_at]) VALUES
    (1, N'Admin', N'Quản trị hệ thống', SYSUTCDATETIME(), NULL),
    (2, N'Staff', N'Nhân viên rạp / soát vé', SYSUTCDATETIME(), NULL),
    (3, N'Customer', N'Khách hàng đặt vé', SYSUTCDATETIME(), NULL),
    (4, N'Manager', N'Quản lý rạp', SYSUTCDATETIME(), NULL);

    SET IDENTITY_INSERT [dbo].[countries] ON;
    INSERT INTO [dbo].[countries] ([country_id], [country_name], [country_code]) VALUES
    (1, N'Mỹ', N'US'), (2, N'Anh', N'GB'), (3, N'Hàn Quốc', N'KR'),
    (4, N'Nhật Bản', N'JP'), (5, N'Việt Nam', N'VN'), (6, N'Pháp', N'FR');
    SET IDENTITY_INSERT [dbo].[countries] OFF;

    INSERT INTO [dbo].[genres] ([genre_id], [genre_name], [description], [created_at], [updated_at]) VALUES
    (1,N'Hành động',N'Phim hành động, rượt đuổi, chiến đấu',SYSUTCDATETIME(),NULL),
    (2,N'Phiêu lưu',N'Khám phá, hành trình, thế giới mới',SYSUTCDATETIME(),NULL),
    (3,N'Hoạt hình',N'Phim hoạt hình cho gia đình',SYSUTCDATETIME(),NULL),
    (4,N'Hài hước',N'Phim có yếu tố hài',SYSUTCDATETIME(),NULL),
    (5,N'Tội phạm',N'Điều tra, băng nhóm, phá án',SYSUTCDATETIME(),NULL),
    (6,N'Tài liệu',N'Phim tài liệu',SYSUTCDATETIME(),NULL),
    (7,N'Kịch tính',N'Drama, cao trào cảm xúc',SYSUTCDATETIME(),NULL),
    (8,N'Kinh dị',N'Phim kinh dị, tâm linh',SYSUTCDATETIME(),NULL),
    (9,N'Âm nhạc',N'Phim âm nhạc',SYSUTCDATETIME(),NULL),
    (10,N'Bí ẩn',N'Bí mật, điều tra, suy luận',SYSUTCDATETIME(),NULL),
    (11,N'Lãng mạn',N'Tình cảm, lãng mạn',SYSUTCDATETIME(),NULL),
    (12,N'Khoa học viễn tưởng',N'Tương lai, công nghệ, không gian',SYSUTCDATETIME(),NULL),
    (13,N'Giật gân',N'Gây cấn, hồi hộp',SYSUTCDATETIME(),NULL),
    (14,N'Viễn Tây',N'Cao bồi, miền Tây',SYSUTCDATETIME(),NULL),
    (15,N'Siêu anh hùng',N'Siêu anh hùng, đa vũ trụ',SYSUTCDATETIME(),NULL);

    INSERT INTO [dbo].[day_types] ([day_type_id], [type_name], [description]) VALUES
    (1,N'Weekday',N'Thứ Hai đến Thứ Sáu'),
    (2,N'Weekend',N'Thứ Bảy và Chủ Nhật'),
    (3,N'Holiday',N'Ngày lễ / Tết');

    INSERT INTO [dbo].[hall_types] ([hall_type_id], [type_name], [description], [surcharge_pct]) VALUES
    (1,N'Standard 2D',N'Phòng chiếu 2D tiêu chuẩn',0),
    (2,N'Premium 3D',N'Phòng chiếu 3D cao cấp',20),
    (3,N'IMAX',N'Phòng chiếu IMAX màn hình lớn',50),
    (4,N'VIP',N'Phòng chiếu VIP với ghế cao cấp',80),
    (5,N'4DX',N'Phòng chiếu 4DX hiệu ứng động',60);

    INSERT INTO [dbo].[seat_types] ([seat_type_id], [type_name], [description], [price_modifier], [created_at], [updated_at]) VALUES
    (1,N'Standard',N'Ghế thường',0,SYSUTCDATETIME(),NULL),
    (2,N'Premium',N'Ghế đẹp khu trung tâm',30000,SYSUTCDATETIME(),NULL),
    (3,N'VIP',N'Ghế VIP rộng, vị trí đẹp',80000,SYSUTCDATETIME(),NULL),
    (4,N'Sweetbox',N'Ghế đôi Sweetbox',100000,SYSUTCDATETIME(),NULL);

    SET IDENTITY_INSERT [dbo].[member_tiers] ON;
    INSERT INTO [dbo].[member_tiers] ([tier_id], [tier_name], [min_points], [discount_percent], [benefits]) VALUES
    (1,N'Standard',0,0,N'Thành viên thường'),
    (2,N'Silver',500,5,N'Giảm 5% đồ ăn'),
    (3,N'Gold',1500,10,N'Giảm 10% vé xem phim'),
    (4,N'Diamond',5000,15,N'Ưu tiên đặt vé và giảm 15%');
    SET IDENTITY_INSERT [dbo].[member_tiers] OFF;

    ------------------------------------------------------------
    -- 2. Chuỗi rạp, rạp và phòng chiếu
    ------------------------------------------------------------
    SET IDENTITY_INSERT [dbo].[Chains] ON;
    INSERT INTO [dbo].[Chains] ([chain_id], [chain_name], [logo_url], [website]) VALUES
    (1,N'CineMiu Cinemas',N'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',N'https://cinemiu.vn'),
    (2,N'CineMiu Premium',N'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300',N'https://premium.cinemiu.vn'),
    (3,N'CineMiu Star',N'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300',N'https://star.cinemiu.vn');
    SET IDENTITY_INSERT [dbo].[Chains] OFF;

    SET IDENTITY_INSERT [dbo].[cinemas] ON;
    INSERT INTO [dbo].[cinemas] ([cinema_id], [chain_id], [cinema_name], [address], [city], [district], [phone], [email], [latitude], [longitude], [map_url], [image_url], [is_active], [created_at], [updated_at]) VALUES
    (1,1,N'CineMiu Bà Triệu',N'191 Bà Triệu',N'Hà Nội',N'Hai Bà Trưng',N'0246000001',N'batrieu@cinemiu.vn',21.0119400,105.8477600,N'https://maps.google.com',N'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',1,SYSUTCDATETIME(),NULL),
    (2,1,N'CineMiu Long Biên',N'27 Cổ Linh',N'Hà Nội',N'Long Biên',N'0246000002',N'longbien@cinemiu.vn',21.0490000,105.9010000,N'https://maps.google.com',N'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600',1,SYSUTCDATETIME(),NULL),
    (3,2,N'CineMiu Liễu Giai',N'54 Liễu Giai',N'Hà Nội',N'Ba Đình',N'0246000003',N'lieugiai@cinemiu.vn',21.0336000,105.8270000,N'https://maps.google.com',N'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',1,SYSUTCDATETIME(),NULL),
    (4,2,N'CineMiu Đồng Khởi',N'72 Lê Thánh Tôn',N'TP.HCM',N'Quận 1',N'0286000004',N'dongkhoi@cinemiu.vn',10.7769900,106.7009900,N'https://maps.google.com',N'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600',1,SYSUTCDATETIME(),NULL),
    (5,3,N'CineMiu Phạm Hùng',N'Vincom Mega Mall Phạm Hùng',N'TP.HCM',N'Bình Chánh',N'0286000005',N'phamhung@cinemiu.vn',10.7326000,106.6962000,N'https://maps.google.com',N'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600',1,SYSUTCDATETIME(),NULL);
    SET IDENTITY_INSERT [dbo].[cinemas] OFF;

    SET IDENTITY_INSERT [dbo].[halls] ON;
    INSERT INTO [dbo].[halls] ([hall_id], [cinema_id], [hall_type_id], [hall_name], [total_rows], [total_cols], [total_seats], [status], [created_at], [updated_at]) VALUES
    (1,1,1,N'Phòng 1 - Standard',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(2,1,2,N'Phòng 2 - 3D',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(3,1,3,N'Phòng 3 - IMAX',10,15,150,N'Active',SYSUTCDATETIME(),NULL),
    (4,2,1,N'Phòng 1 - Standard',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(5,2,2,N'Phòng 2 - 3D',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(6,2,5,N'Phòng 3 - 4DX',10,15,150,N'Active',SYSUTCDATETIME(),NULL),
    (7,3,1,N'Phòng 1 - Standard',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(8,3,4,N'Phòng 2 - VIP',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(9,3,3,N'Phòng 3 - IMAX',10,15,150,N'Active',SYSUTCDATETIME(),NULL),
    (10,4,1,N'Phòng 1 - Standard',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(11,4,2,N'Phòng 2 - 3D',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(12,4,3,N'Phòng 3 - IMAX',10,15,150,N'Active',SYSUTCDATETIME(),NULL),
    (13,5,1,N'Phòng 1 - Standard',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(14,5,4,N'Phòng 2 - VIP',10,15,150,N'Active',SYSUTCDATETIME(),NULL),(15,5,5,N'Phòng 3 - 4DX',10,15,150,N'Active',SYSUTCDATETIME(),NULL);
    SET IDENTITY_INSERT [dbo].[halls] OFF;

    ------------------------------------------------------------
    -- 3. Ghế: mỗi phòng A-J, 1-15 = 150 ghế
    --    H,I là VIP; J là Sweetbox; D-F cột 3-10 là Premium
    ------------------------------------------------------------
    DECLARE @hallId INT = 1, @row INT, @col INT, @rowLabel NVARCHAR(2), @seatType TINYINT;
    WHILE @hallId <= 15
    BEGIN
        SET @row = 1;
        WHILE @row <= 10
        BEGIN
            SET @rowLabel = CHAR(64 + @row);
            SET @col = 1;
            WHILE @col <= 15
            BEGIN
                SET @seatType = CASE
                    WHEN @rowLabel = N'J' THEN 4
                    WHEN @rowLabel IN (N'H', N'I') THEN 3
                    WHEN @rowLabel IN (N'D', N'E', N'F') AND @col BETWEEN 3 AND 10 THEN 2
                    ELSE 1 END;

                INSERT INTO [dbo].[seats] ([hall_id], [seat_type_id], [row_label], [col_number], [seat_code], [is_active], [created_at], [updated_at])
                VALUES (@hallId, @seatType, @rowLabel, @col, CONCAT(@rowLabel, @col), 1, SYSUTCDATETIME(), NULL);

                SET @col += 1;
            END
            SET @row += 1;
        END
        SET @hallId += 1;
    END

    ------------------------------------------------------------
    -- 4. Đồ ăn, phương thức thanh toán, khuyến mãi
    ------------------------------------------------------------
    INSERT INTO [dbo].[concession_categories] ([cat_id], [cat_name], [created_at], [updated_at]) VALUES
    (1,N'Nước uống',SYSUTCDATETIME(),NULL),(2,N'Bắp rang',SYSUTCDATETIME(),NULL),(3,N'Đồ ăn nhẹ',SYSUTCDATETIME(),NULL),(4,N'Combo',SYSUTCDATETIME(),NULL);

    SET IDENTITY_INSERT [dbo].[concession_items] ON;
    INSERT INTO [dbo].[concession_items] ([item_id], [cat_id], [item_name], [description], [price], [image_url], [is_available], [created_at], [updated_at]) VALUES
    (1,1,N'Coca-Cola cỡ nhỏ',N'Lon Coca-Cola 330ml',25000,N'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200',1,SYSUTCDATETIME(),NULL),
    (2,1,N'Coca-Cola cỡ lớn',N'Coca-Cola size L 600ml',35000,N'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200',1,SYSUTCDATETIME(),NULL),
    (3,2,N'Bắp rang bơ vừa',N'Bắp rang bơ size M',65000,N'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=200',1,SYSUTCDATETIME(),NULL),
    (4,2,N'Bắp rang phô mai lớn',N'Bắp rang vị phô mai size L',85000,N'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=200',1,SYSUTCDATETIME(),NULL),
    (5,3,N'Hotdog',N'Xúc xích nóng kèm sốt',55000,N'https://images.unsplash.com/photo-1612392166886-ee8475b03af2?w=200',1,SYSUTCDATETIME(),NULL),
    (6,4,N'Combo Couple',N'1 bắp M + 2 nước L',125000,N'https://images.unsplash.com/photo-1569456558895-d93fba71ee65?w=200',1,SYSUTCDATETIME(),NULL),
    (7,4,N'Combo Family',N'2 bắp L + 4 nước L + hotdog',280000,N'https://images.unsplash.com/photo-1569456558895-d93fba71ee65?w=200',1,SYSUTCDATETIME(),NULL);
    SET IDENTITY_INSERT [dbo].[concession_items] OFF;

    INSERT INTO [dbo].[payment_methods] ([method_id], [method_name], [provider], [logo_url], [is_active]) VALUES
    (1,N'Tiền mặt',N'CineMiu',NULL,1),
    (2,N'VNPay',N'VNPay',N'https://vnpay.vn/assets/images/logo-icon/logo-primary.svg',1),
    (3,N'MoMo',N'MoMo',N'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',1),
    (4,N'ZaloPay',N'ZaloPay',NULL,1);

    SET IDENTITY_INSERT [dbo].[promotions] ON;
    INSERT INTO [dbo].[promotions] ([promo_id], [promo_code], [description], [discount_type], [discount_value], [min_order_amt], [max_discount], [total_uses], [usage_limit], [per_user_limit], [valid_from], [valid_to], [is_active], [created_at], [updated_at]) VALUES
    (1,N'WELCOME10',N'Giảm 10% cho khách hàng mới',N'Percent',10,100000,50000,0,500,1,'2026-05-01','2026-08-31',1,SYSUTCDATETIME(),NULL),
    (2,N'CINEMIU50K',N'Giảm ngay 50.000đ cho đơn từ 200.000đ',N'Fixed',50000,200000,50000,0,300,2,'2026-05-01','2026-08-31',1,SYSUTCDATETIME(),NULL),
    (3,N'STUDENT20',N'Ưu đãi học sinh sinh viên 20%',N'Percent',20,80000,60000,0,500,3,'2026-05-01','2026-08-31',1,SYSUTCDATETIME(),NULL),
    (4,N'WEEKEND15',N'Giảm 15% cuối tuần',N'Percent',15,150000,70000,0,200,1,'2026-05-01','2026-08-31',1,SYSUTCDATETIME(),NULL),
    (5,N'COMBO30K',N'Giảm 30.000đ khi mua combo',N'Fixed',30000,150000,30000,0,400,2,'2026-05-01','2026-08-31',1,SYSUTCDATETIME(),NULL);
    SET IDENTITY_INSERT [dbo].[promotions] OFF;

    ------------------------------------------------------------
    -- 5. Users và memberships
    ------------------------------------------------------------
    SET IDENTITY_INSERT [dbo].[users] ON;
    INSERT INTO [dbo].[users] ([user_id], [role_id], [cinema_id], [full_name], [email], [phone], [password_hash], [avatar_url], [date_of_birth], [gender], [is_active], [created_at], [updated_at]) VALUES
    (1,1,NULL,N'Quản trị CineMiu',N'admin@cinemiu.vn',N'0901000001',N'$2a$12$DemoHashAdmin',N'https://i.pravatar.cc/150?img=1','1988-01-01',N'Nam',1,SYSUTCDATETIME(),NULL),
    (2,4,1,N'Nguyễn Mai Manager',N'manager@cinemiu.vn',N'0901000002',N'$2a$12$DemoHashManager',N'https://i.pravatar.cc/150?img=2','1990-05-10',N'Nữ',1,SYSUTCDATETIME(),NULL),
    (3,2,1,N'Trần Staff Một',N'staff1@cinemiu.vn',N'0902000001',N'$2a$12$DemoHashStaff',N'https://i.pravatar.cc/150?img=3','1996-06-15',N'Nữ',1,SYSUTCDATETIME(),NULL),
    (4,2,2,N'Lê Staff Hai',N'staff2@cinemiu.vn',N'0902000002',N'$2a$12$DemoHashStaff',N'https://i.pravatar.cc/150?img=4','1995-09-20',N'Nam',1,SYSUTCDATETIME(),NULL);
    DECLARE @u INT = 5;
    WHILE @u <= 34
    BEGIN
        INSERT INTO [dbo].[users] ([user_id], [role_id], [cinema_id], [full_name], [email], [phone], [password_hash], [avatar_url], [date_of_birth], [gender], [is_active], [created_at], [updated_at])
        VALUES (@u, 3, NULL, CONCAT(N'Khách hàng Demo ', @u), CONCAT(N'customer', @u, N'@gmail.com'), CONCAT(N'0903', RIGHT(CONCAT('000000', @u), 6)), N'$2a$12$DemoHashCustomer', CONCAT(N'https://i.pravatar.cc/150?img=', @u), DATEADD(YEAR, -20-(@u%10), '2026-01-01'), CASE WHEN @u % 2 = 0 THEN N'Nam' ELSE N'Nữ' END, 1, SYSUTCDATETIME(), NULL);
        SET @u += 1;
    END
    SET IDENTITY_INSERT [dbo].[users] OFF;

    SET IDENTITY_INSERT [dbo].[user_memberships] ON;
    SET @u = 1;
    WHILE @u <= 34
    BEGIN
        INSERT INTO [dbo].[user_memberships] ([user_id], [total_points], [tier_id], [updated_at])
        VALUES (@u, CASE WHEN @u < 5 THEN 0 ELSE (@u * 83) % 6200 END,
                CASE WHEN ((@u * 83) % 6200) >= 5000 THEN 4 WHEN ((@u * 83) % 6200) >= 1500 THEN 3 WHEN ((@u * 83) % 6200) >= 500 THEN 2 ELSE 1 END,
                SYSUTCDATETIME());
        SET @u += 1;
    END
    SET IDENTITY_INSERT [dbo].[user_memberships] OFF;

    ------------------------------------------------------------
    -- 6. Movies
    ------------------------------------------------------------
    SET IDENTITY_INSERT [dbo].[movies] ON;
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (1,N'Lật Mặt 8: Vòng Tay Nắng',N'Face Off 8',5,135,N'2026-05-01',N'2026-08-20',N'T13',N'NowShowing',N'Một câu chuyện gia đình xen lẫn hành động, hài hước và những lựa chọn cảm xúc.',N'Lý Hải',N'Thanh Thức, Võ Điền Gia Huy, Ma Ran Đô',N'Tiếng Việt',N'Không',N'https://image.tmdb.org/t/p/w500/1.jpg',N'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',N'https://youtube.com/watch?v=trailer1',7.5,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (2,N'Địa Đạo: Mặt Trời Trong Bóng Tối',N'Tunnel: Sun in the Dark',5,128,N'2026-05-04',N'2026-08-18',N'T16',N'NowShowing',N'Bộ phim chiến tranh tái hiện lòng quả cảm và tinh thần đồng đội trong thời khắc sinh tử.',N'Bùi Thạc Chuyên',N'Thái Hòa, Quang Tuấn, Diễm My',N'Tiếng Việt',N'English',N'https://image.tmdb.org/t/p/w500/2.jpg',N'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200',N'https://youtube.com/watch?v=trailer2',8.1,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (3,N'Avengers: Secret Wars',N'Avengers: Secret Wars',1,150,N'2026-05-10',N'2026-08-20',N'T13',N'NowShowing',N'Các siêu anh hùng hợp lực chống lại mối đe dọa đa vũ trụ.',N'Anthony Russo',N'Robert Downey Jr., Chris Evans, Tom Holland',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/3.jpg',N'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200',N'https://youtube.com/watch?v=trailer3',8.4,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (4,N'Spider-Man: Beyond the Spider-Verse',N'Spider-Man: Beyond the Spider-Verse',1,125,N'2026-05-12',N'2026-08-16',N'T13',N'NowShowing',N'Miles Morales tiếp tục chuyến phiêu lưu qua các vũ trụ Người Nhện.',N'Joaquim Dos Santos',N'Shameik Moore, Hailee Steinfeld',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/4.jpg',N'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=1200',N'https://youtube.com/watch?v=trailer4',8.6,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (5,N'Mission: Impossible - Final Reckoning',N'Mission: Impossible',1,145,N'2026-05-15',N'2026-08-10',N'T16',N'NowShowing',N'Ethan Hunt bước vào nhiệm vụ cuối cùng với mức độ nguy hiểm chưa từng có.',N'Christopher McQuarrie',N'Tom Cruise, Hayley Atwell',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/5.jpg',N'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200',N'https://youtube.com/watch?v=trailer5',8.0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (6,N'Inside Out 2',N'Inside Out 2',1,100,N'2026-05-18',N'2026-08-05',N'P',N'NowShowing',N'Những cảm xúc mới xuất hiện khi Riley bước vào tuổi thiếu niên.',N'Kelsey Mann',N'Amy Poehler, Maya Hawke',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/6.jpg',N'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=1200',N'https://youtube.com/watch?v=trailer6',8.3,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (7,N'Dune: Part Three',N'Dune: Part Three',1,155,N'2026-05-20',N'2026-08-20',N'T13',N'NowShowing',N'Hành trình của Paul Atreides mở rộng trên hành tinh cát Arrakis.',N'Denis Villeneuve',N'Timothée Chalamet, Zendaya',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/7.jpg',N'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',N'https://youtube.com/watch?v=trailer7',8.7,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (8,N'Detective Conan: Dư Ảnh Độc Nhãn',N'Detective Conan Movie',4,110,N'2026-05-22',N'2026-08-12',N'T13',N'NowShowing',N'Conan đối mặt với vụ án phức tạp liên quan đến bí mật trong bóng tối.',N'Yuzuru Tachikawa',N'Minami Takayama, Wakana Yamazaki',N'Japanese',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/8.jpg',N'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200',N'https://youtube.com/watch?v=trailer8',7.9,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (9,N'Godzilla x Kong: Đế Chế Mới',N'Godzilla x Kong',1,118,N'2026-05-25',N'2026-08-15',N'T13',N'NowShowing',N'Hai titan huyền thoại cùng đối đầu thế lực cổ đại dưới lòng đất.',N'Adam Wingard',N'Rebecca Hall, Brian Tyree Henry',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/9.jpg',N'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1200',N'https://youtube.com/watch?v=trailer9',7.4,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (10,N'Mai',N'Mai',5,131,N'2026-05-28',N'2026-08-18',N'T18',N'NowShowing',N'Câu chuyện tình cảm, gia đình và lựa chọn sống của một người phụ nữ trưởng thành.',N'Trấn Thành',N'Phương Anh Đào, Tuấn Trần',N'Tiếng Việt',N'Không',N'https://image.tmdb.org/t/p/w500/10.jpg',N'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=1200',N'https://youtube.com/watch?v=trailer10',7.8,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (11,N'Toy Story 5',N'Toy Story 5',1,100,N'2026-07-01',N'2026-10-10',N'P',N'ComingSoon',N'Những món đồ chơi quen thuộc trở lại trong chuyến phiêu lưu mới.',N'Andrew Stanton',N'Tom Hanks, Tim Allen',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/11.jpg',N'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=1200',N'https://youtube.com/watch?v=trailer11',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (12,N'Frozen 3',N'Frozen 3',1,105,N'2026-07-05',N'2026-10-12',N'P',N'ComingSoon',N'Elsa và Anna bước vào hành trình khám phá bí mật mới của Arendelle.',N'Jennifer Lee',N'Idina Menzel, Kristen Bell',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/12.jpg',N'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200',N'https://youtube.com/watch?v=trailer12',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (13,N'The Batman Part II',N'The Batman Part II',1,150,N'2026-07-10',N'2026-10-20',N'T16',N'ComingSoon',N'Người Dơi tiếp tục điều tra thế giới tội phạm ngầm tại Gotham.',N'Matt Reeves',N'Robert Pattinson, Zoë Kravitz',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/13.jpg',N'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=1200',N'https://youtube.com/watch?v=trailer13',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (14,N'Avatar: Fire and Ash',N'Avatar: Fire and Ash',1,170,N'2026-07-15',N'2026-11-01',N'T13',N'ComingSoon',N'Pandora mở ra những vùng đất mới cùng các bộ tộc chưa từng xuất hiện.',N'James Cameron',N'Sam Worthington, Zoe Saldaña',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/14.jpg',N'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=1200',N'https://youtube.com/watch?v=trailer14',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (15,N'How to Train Your Dragon',N'How to Train Your Dragon',1,120,N'2026-07-20',N'2026-10-30',N'P',N'ComingSoon',N'Tình bạn giữa Hiccup và Răng Sún được kể lại bằng phiên bản mới.',N'Dean DeBlois',N'Mason Thames, Nico Parker',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/15.jpg',N'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',N'https://youtube.com/watch?v=trailer15',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (16,N'F1: The Movie',N'F1',1,135,N'2026-07-25',N'2026-10-25',N'T13',N'ComingSoon',N'Một tay đua kỳ cựu trở lại đường đua với khát vọng chiến thắng.',N'Joseph Kosinski',N'Brad Pitt, Damson Idris',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/16.jpg',N'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1200',N'https://youtube.com/watch?v=trailer16',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (17,N'Jurassic World: Rebirth',N'Jurassic World: Rebirth',1,130,N'2026-08-01',N'2026-11-15',N'T13',N'ComingSoon',N'Kỷ nguyên khủng long bước sang chương mới với những thí nghiệm nguy hiểm.',N'Gareth Edwards',N'Scarlett Johansson, Jonathan Bailey',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/17.jpg',N'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200',N'https://youtube.com/watch?v=trailer17',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (18,N'The Fantastic Four',N'The Fantastic Four',1,128,N'2026-08-05',N'2026-11-20',N'T13',N'ComingSoon',N'Gia đình siêu anh hùng đầu tiên của Marvel xuất hiện trên màn ảnh rộng.',N'Matt Shakman',N'Pedro Pascal, Vanessa Kirby',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/18.jpg',N'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1200',N'https://youtube.com/watch?v=trailer18',0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (19,N'Nhiệm Vụ Bất Khả Thi: Bóng Ma',N'Impossible Mission: Phantom',5,122,N'2026-04-01',N'2026-05-30',N'T16',N'Ended',N'Một đặc vụ phải xóa sạch dấu vết trong nhiệm vụ tưởng như bất khả thi.',N'Nguyễn Quang Dũng',N'Liên Bỉnh Phát, Kaity Nguyễn',N'Tiếng Việt',N'Không',N'https://image.tmdb.org/t/p/w500/19.jpg',N'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200',N'https://youtube.com/watch?v=trailer19',7.0,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (20,N'Kẻ Ăn Hồn',N'Soul Reaper',5,110,N'2026-03-20',N'2026-05-28',N'T18',N'Ended',N'Một ngôi làng cổ bị ám ảnh bởi lời nguyền truyền qua nhiều thế hệ.',N'Trần Hữu Tấn',N'Hoàng Hà, Võ Điền Gia Huy',N'Tiếng Việt',N'Không',N'https://image.tmdb.org/t/p/w500/20.jpg',N'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1200',N'https://youtube.com/watch?v=trailer20',6.9,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (21,N'Kung Fu Panda 4',N'Kung Fu Panda 4',1,94,N'2026-03-15',N'2026-05-20',N'P',N'Ended',N'Po đối mặt thử thách mới để trở thành thủ lĩnh tinh thần.',N'Mike Mitchell',N'Jack Black, Awkwafina',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/21.jpg',N'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=1200',N'https://youtube.com/watch?v=trailer21',7.2,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (22,N'Exhuma: Quật Mộ Trùng Ma',N'Exhuma',3,134,N'2026-03-10',N'2026-05-22',N'T16',N'Ended',N'Một nghi thức khai quật mở ra chuỗi hiện tượng siêu nhiên đáng sợ.',N'Jang Jae-hyun',N'Choi Min-sik, Kim Go-eun',N'Korean',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/22.jpg',N'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1200',N'https://youtube.com/watch?v=trailer22',7.6,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (23,N'Oppenheimer',N'Oppenheimer',1,180,N'2026-02-01',N'2026-04-30',N'T16',N'Ended',N'Chân dung nhà khoa học đứng sau dự án làm thay đổi lịch sử nhân loại.',N'Christopher Nolan',N'Cillian Murphy, Emily Blunt',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/23.jpg',N'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',N'https://youtube.com/watch?v=trailer23',8.5,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (24,N'Barbie',N'Barbie',1,114,N'2026-02-10',N'2026-04-25',N'T13',N'Ended',N'Barbie rời thế giới hoàn hảo để khám phá ý nghĩa thật của bản thân.',N'Greta Gerwig',N'Margot Robbie, Ryan Gosling',N'English',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/24.jpg',N'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=1200',N'https://youtube.com/watch?v=trailer24',7.1,SYSUTCDATETIME(),NULL);
    INSERT INTO [dbo].[movies] ([movie_id],[title],[title_en],[country_id],[duration_mins],[release_date],[end_date],[age_rating],[status],[synopsis],[director],[cast_members],[language],[subtitle],[poster_url],[banner_url],[trailer_url],[imdb_rating],[created_at],[updated_at]) VALUES (25,N'Doraemon: Nobita Và Bản Giao Hưởng Địa Cầu',N'Doraemon Movie',4,108,N'2026-04-15',N'2026-06-30',N'P',N'NowShowing',N'Nobita cùng Doraemon bảo vệ âm nhạc của Trái Đất khỏi nguy cơ biến mất.',N'Kazuaki Imai',N'Wasabi Mizuta, Megumi Oohara',N'Japanese',N'Vietnamese',N'https://image.tmdb.org/t/p/w500/25.jpg',N'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200',N'https://youtube.com/watch?v=trailer25',7.7,SYSUTCDATETIME(),NULL);
    SET IDENTITY_INSERT [dbo].[movies] OFF;

    INSERT INTO [dbo].[movie_genres] ([movie_id],[genre_id]) VALUES
    (1,1),
    (1,2),
    (1,4),
    (2,1),
    (2,7),
    (2,13),
    (3,1),
    (3,2),
    (3,15),
    (4,3),
    (4,2),
    (4,15),
    (5,1),
    (5,5),
    (5,13),
    (6,3),
    (6,4),
    (7,2),
    (7,12),
    (7,7),
    (8,3),
    (8,10),
    (8,13),
    (9,1),
    (9,2),
    (9,12),
    (10,7),
    (10,11),
    (11,3),
    (11,4),
    (12,3),
    (12,9),
    (13,1),
    (13,5),
    (13,10),
    (14,2),
    (14,12),
    (15,3),
    (15,2),
    (16,1),
    (16,7),
    (17,2),
    (17,12),
    (17,13),
    (18,1),
    (18,12),
    (18,15),
    (19,1),
    (19,13),
    (20,8),
    (20,10),
    (20,13),
    (21,3),
    (21,4),
    (22,8),
    (22,10),
    (23,6),
    (23,7),
    (24,4),
    (24,11),
    (25,3),
    (25,9),
    (25,2);


    ------------------------------------------------------------
    -- 7. Ticket prices: 5 rạp x 5 loại phòng x 4 loại ghế x 3 loại ngày x 3 khung giờ = 900 dòng
    ------------------------------------------------------------
    DECLARE @cinema INT = 1, @hallType TINYINT, @seatTypeId TINYINT, @dayType TINYINT, @slot NVARCHAR(20), @base DECIMAL(10,2);
    WHILE @cinema <= 5
    BEGIN
        SET @hallType = 1;
        WHILE @hallType <= 5
        BEGIN
            SET @seatTypeId = 1;
            WHILE @seatTypeId <= 4
            BEGIN
                SET @dayType = 1;
                WHILE @dayType <= 3
                BEGIN
                    DECLARE slot_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT v FROM (VALUES (N'Morning'),(N'Afternoon'),(N'Evening')) s(v);
                    OPEN slot_cursor;
                    FETCH NEXT FROM slot_cursor INTO @slot;
                    WHILE @@FETCH_STATUS = 0
                    BEGIN
                        SET @base = 70000
                            + CASE @cinema WHEN 3 THEN 5000 WHEN 4 THEN 10000 WHEN 5 THEN 5000 ELSE 0 END
                            + CASE @hallType WHEN 2 THEN 20000 WHEN 3 THEN 50000 WHEN 4 THEN 80000 WHEN 5 THEN 60000 ELSE 0 END
                            + CASE @seatTypeId WHEN 2 THEN 30000 WHEN 3 THEN 80000 WHEN 4 THEN 100000 ELSE 0 END
                            + CASE @dayType WHEN 2 THEN 15000 WHEN 3 THEN 30000 ELSE 0 END
                            + CASE @slot WHEN N'Evening' THEN 20000 WHEN N'Afternoon' THEN 10000 ELSE 0 END;

                        INSERT INTO [dbo].[ticket_prices] ([cinema_id],[hall_type_id],[seat_type_id],[day_type_id],[time_slot],[base_price],[effective_from],[effective_to])
                        VALUES (@cinema,@hallType,@seatTypeId,@dayType,@slot,@base,'2026-05-01','2026-12-31');
                        FETCH NEXT FROM slot_cursor INTO @slot;
                    END
                    CLOSE slot_cursor;
                    DEALLOCATE slot_cursor;
                    SET @dayType += 1;
                END
                SET @seatTypeId += 1;
            END
            SET @hallType += 1;
        END
        SET @cinema += 1;
    END

    ------------------------------------------------------------
    -- 8. Showtimes: 04/05/2026 - 20/08/2026
    --    10 phim đang chiếu chính x 5 rạp x 109 ngày = 5450 suất
    ------------------------------------------------------------
    DECLARE @d DATE = '2026-05-04', @movieId INT, @duration INT, @cinemaId INT, @chosenHall INT, @start DATETIME2, @hour INT;
    WHILE @d <= '2026-08-20'
    BEGIN
        SET @cinemaId = 1;
        WHILE @cinemaId <= 5
        BEGIN
            SET @movieId = 1;
            WHILE @movieId <= 10
            BEGIN
                SELECT @duration = duration_mins FROM [dbo].[movies] WHERE movie_id = @movieId;
                SELECT TOP 1 @chosenHall = hall_id
                FROM [dbo].[halls]
                WHERE cinema_id = @cinemaId
                ORDER BY ABS(CHECKSUM(CONCAT(@movieId, '-', @cinemaId, '-', CONVERT(NVARCHAR(10), @d, 120), '-', hall_id)));

                SET @hour = CASE @movieId % 5 WHEN 1 THEN 9 WHEN 2 THEN 12 WHEN 3 THEN 15 WHEN 4 THEN 18 ELSE 21 END;
                SET @start = DATEADD(MINUTE, CASE WHEN @movieId % 2 = 0 THEN 30 ELSE 0 END, DATEADD(HOUR, @hour, CAST(@d AS DATETIME2)));

                INSERT INTO [dbo].[showtimes] ([movie_id],[hall_id],[start_time],[end_time],[language_type],[is_special],[status],[created_at],[updated_at])
                VALUES (@movieId,@chosenHall,@start,DATEADD(MINUTE,@duration + 20,@start),CASE WHEN @movieId IN (1,2,10) THEN N'2D Phụ đề Việt' ELSE N'2D Vietsub' END,0,N'Scheduled',SYSUTCDATETIME(),NULL);

                SET @movieId += 1;
            END
            SET @cinemaId += 1;
        END
        SET @d = DATEADD(DAY,1,@d);
    END

    -- Thêm một số suất cho phim sắp chiếu để trang ComingSoon có lịch gần ngày ra mắt
    SET @movieId = 11;
    WHILE @movieId <= 18
    BEGIN
        SELECT @duration = duration_mins FROM [dbo].[movies] WHERE movie_id = @movieId;
        SET @cinemaId = 1;
        WHILE @cinemaId <= 5
        BEGIN
            SELECT TOP 1 @chosenHall = hall_id FROM [dbo].[halls] WHERE cinema_id = @cinemaId ORDER BY hall_id DESC;
            INSERT INTO [dbo].[showtimes] ([movie_id],[hall_id],[start_time],[end_time],[language_type],[is_special],[status],[created_at],[updated_at])
            SELECT @movieId,@chosenHall,DATEADD(HOUR, 19, CAST(release_date AS DATETIME2)),DATEADD(MINUTE,@duration + 20,DATEADD(HOUR,19,CAST(release_date AS DATETIME2))),N'2D Vietsub',1,N'Scheduled',SYSUTCDATETIME(),NULL
            FROM [dbo].[movies] WHERE movie_id = @movieId;
            SET @cinemaId += 1;
        END
        SET @movieId += 1;
    END

    ------------------------------------------------------------
    -- 9. Bookings, tickets, payments, points, promo usages
    ------------------------------------------------------------
    DECLARE @i INT = 1, @bookingId INT, @showtimeId INT, @userId INT, @status NVARCHAR(20), @final DECIMAL(12,2), @discount DECIMAL(12,2), @total DECIMAL(12,2), @seatId INT, @ticketCount INT, @j INT, @method TINYINT;
    WHILE @i <= 80
    BEGIN
        SET @userId = 5 + (@i % 30);
        SELECT TOP 1 @showtimeId = showtime_id FROM [dbo].[showtimes] ORDER BY ABS(CHECKSUM(CONCAT(@i, '-', showtime_id)));
        SET @status = CASE WHEN @i <= 60 THEN N'confirmed' WHEN @i <= 70 THEN N'pending' ELSE N'cancelled' END;
        SET @ticketCount = CASE WHEN @i % 3 = 0 THEN 3 WHEN @i % 2 = 0 THEN 2 ELSE 1 END;
        SET @total = @ticketCount * (90000 + ((@i % 5) * 15000));
        SET @discount = CASE WHEN @i % 4 = 0 THEN 30000 WHEN @i % 5 = 0 THEN 50000 ELSE 0 END;
        SET @final = @total - @discount;

        INSERT INTO [dbo].[bookings] ([user_id],[showtime_id],[booking_code],[total_amount],[discount_amount],[final_amount],[status],[booking_channel],[created_at],[expires_at],[confirmed_at],[cancelled_at],[cancel_reason],[notes])
        VALUES (@userId,@showtimeId,CONCAT(N'CM',FORMAT(DATEADD(DAY,-(80-@i),'2026-06-06'),'yyyyMMdd'),RIGHT(CONCAT('0000',@i),4)),@total,@discount,@final,@status,N'web',DATEADD(DAY,-(80-@i),'2026-06-06'),DATEADD(MINUTE,10,DATEADD(DAY,-(80-@i),'2026-06-06')),CASE WHEN @status=N'confirmed' THEN DATEADD(MINUTE,2,DATEADD(DAY,-(80-@i),'2026-06-06')) ELSE NULL END,CASE WHEN @status=N'cancelled' THEN DATEADD(MINUTE,5,DATEADD(DAY,-(80-@i),'2026-06-06')) ELSE NULL END,CASE WHEN @status=N'cancelled' THEN N'Khách hủy giao dịch demo' ELSE NULL END,N'Dữ liệu demo CineMiu');
        SET @bookingId = SCOPE_IDENTITY();

        SET @j = 1;
        WHILE @j <= @ticketCount
        BEGIN
            SELECT TOP 1 @seatId = s.seat_id
            FROM [dbo].[seats] s
            JOIN [dbo].[showtimes] st ON st.hall_id = s.hall_id
            WHERE st.showtime_id = @showtimeId
            ORDER BY ABS(CHECKSUM(CONCAT(@bookingId, '-', @j, '-', s.seat_id)));

            INSERT INTO [dbo].[tickets] ([booking_id],[seat_id],[seat_type_id],[price],[qr_code],[is_used],[used_at],[checked_by])
            SELECT @bookingId, @seatId, seat_type_id, (@final / @ticketCount), CONCAT(N'QR-CINEMIU-',@bookingId,N'-',@j,N'-',@seatId), CASE WHEN @status=N'confirmed' AND @i % 10 = 0 THEN 1 ELSE 0 END, CASE WHEN @status=N'confirmed' AND @i % 10 = 0 THEN DATEADD(HOUR,1,GETDATE()) ELSE NULL END, CASE WHEN @status=N'confirmed' AND @i % 10 = 0 THEN 3 ELSE NULL END
            FROM [dbo].[seats] WHERE seat_id = @seatId;

            SET @j += 1;
        END

        IF @status IN (N'confirmed', N'cancelled')
        BEGIN
            SET @method = 2 + (@i % 3);
            INSERT INTO [dbo].[payments] ([booking_id],[method_id],[transaction_ref],[amount],[currency],[status],[gateway_response],[paid_at],[refund_amount],[refunded_at])
            VALUES (@bookingId,@method,CONCAT(N'TXN-CM-',@bookingId),@final,N'VND',CASE WHEN @status=N'confirmed' THEN N'paid' ELSE N'refunded' END,N'Demo gateway response',CASE WHEN @status=N'confirmed' THEN DATEADD(MINUTE,3,DATEADD(DAY,-(80-@i),'2026-06-06')) ELSE NULL END,CASE WHEN @status=N'cancelled' THEN @final ELSE NULL END,CASE WHEN @status=N'cancelled' THEN DATEADD(MINUTE,8,DATEADD(DAY,-(80-@i),'2026-06-06')) ELSE NULL END);
        END

        IF @status = N'confirmed'
        BEGIN
            INSERT INTO [dbo].[point_transactions] ([user_id],[booking_id],[points],[transaction_type],[description],[created_at])
            VALUES (@userId,@bookingId,CAST(@final/10000 AS INT),N'earn',CONCAT(N'Cộng điểm từ booking ',@bookingId),SYSUTCDATETIME());
        END

        IF @discount > 0
        BEGIN
            INSERT INTO [dbo].[promo_usages] ([promo_id],[user_id],[booking_id],[used_at])
            VALUES (CASE WHEN @discount = 50000 THEN 2 ELSE 5 END,@userId,@bookingId,SYSUTCDATETIME());
        END

        IF @i % 4 = 0
        BEGIN
            INSERT INTO [dbo].[booking_concessions] ([booking_id],[item_id],[quantity],[unit_price],[subtotal])
            VALUES (@bookingId,6,1,125000,125000);
        END

        SET @i += 1;
    END

    UPDATE p
    SET total_uses = x.cnt
    FROM [dbo].[promotions] p
    JOIN (SELECT promo_id, COUNT(*) cnt FROM [dbo].[promo_usages] GROUP BY promo_id) x ON x.promo_id = p.promo_id;

    ------------------------------------------------------------
    -- 10. Reviews và notifications
    ------------------------------------------------------------
    DECLARE @m INT = 1, @reviewUser INT;
    WHILE @m <= 25
    BEGIN
        SET @reviewUser = 5;
        WHILE @reviewUser <= 8
        BEGIN
            INSERT INTO [dbo].[reviews] ([movie_id],[user_id],[rating],[comment],[is_visible],[created_at])
            VALUES (@m,@reviewUser,CAST(3 + ((@m + @reviewUser) % 3) AS TINYINT),
                CASE ((@m + @reviewUser) % 4)
                    WHEN 0 THEN N'Phim hay, hình ảnh đẹp, đáng xem cùng bạn bè.'
                    WHEN 1 THEN N'Nội dung ổn, nhịp phim tốt, âm thanh rạp rất đã.'
                    WHEN 2 THEN N'Diễn viên diễn tự nhiên, trải nghiệm đặt vé thuận tiện.'
                    ELSE N'Phù hợp để demo chức năng đánh giá phim của CineMiu.' END,
                1, DATEADD(DAY,-(@m + @reviewUser),'2026-06-06'));
            SET @reviewUser += 1;
        END
        SET @m += 1;
    END

    INSERT INTO [dbo].[notifications] ([user_id],[type],[title],[message],[is_read],[sent_via],[created_at])
    SELECT TOP 20 user_id,N'booking',N'CineMiu xác nhận đặt vé',CONCAT(N'Booking của bạn đã được tạo thành công. Mã đơn: ', booking_code),0,N'app',created_at
    FROM [dbo].[bookings]
    WHERE status = N'confirmed'
    ORDER BY booking_id DESC;

    -- Bật lại kiểm tra khóa ngoại
    EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

    COMMIT TRANSACTION;

    PRINT N'=== SEED DATA CINEMIU HOÀN TẤT ===';
    SELECT N'roles' AS [table], COUNT(*) AS total FROM [dbo].[roles]
    UNION ALL SELECT N'users', COUNT(*) FROM [dbo].[users]
    UNION ALL SELECT N'movies', COUNT(*) FROM [dbo].[movies]
    UNION ALL SELECT N'cinemas', COUNT(*) FROM [dbo].[cinemas]
    UNION ALL SELECT N'halls', COUNT(*) FROM [dbo].[halls]
    UNION ALL SELECT N'seats', COUNT(*) FROM [dbo].[seats]
    UNION ALL SELECT N'showtimes', COUNT(*) FROM [dbo].[showtimes]
    UNION ALL SELECT N'ticket_prices', COUNT(*) FROM [dbo].[ticket_prices]
    UNION ALL SELECT N'bookings', COUNT(*) FROM [dbo].[bookings]
    UNION ALL SELECT N'tickets', COUNT(*) FROM [dbo].[tickets]
    UNION ALL SELECT N'payments', COUNT(*) FROM [dbo].[payments]
    UNION ALL SELECT N'reviews', COUNT(*) FROM [dbo].[reviews];

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
    DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@Err, 16, 1);
END CATCH;
GO
