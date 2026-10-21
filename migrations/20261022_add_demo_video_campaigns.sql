USE youtube_xu;
GO

SET XACT_ABORT ON;

IF (SELECT COUNT(*) FROM dbo.ad_categories WHERE category_name IN (
    N'Game & Thể thao điện tử',
    N'Giáo dục & Khóa học trực tuyến',
    N'Thời trang & Làm đẹp',
    N'Ẩm thực & Đồ uống',
    N'Công nghệ & Thiết bị điện tử',
    N'Du lịch & Khách sạn'
)) <> 6
    THROW 50000, 'Required demo ad categories are missing.', 1;

IF (SELECT COUNT(*) FROM dbo.users WHERE email IN (
    'admin@youtubexu.vn',
    'adv.vng@gmail.com',
    'adv.shopee@gmail.com',
    'adv.vinamilk@gmail.com'
)) <> 4
    THROW 50000, 'Required demo advertiser or admin accounts are missing.', 1;

BEGIN TRANSACTION;

INSERT INTO dbo.ads (
    advertiser_id, category_id, title, video_url, duration_sec,
    reward_xu, budget_xu, spent_xu, start_date, end_date, status,
    reviewed_by, created_at
)
SELECT
    advertiser.user_id,
    category.category_id,
    sample.title,
    sample.video_url,
    sample.duration_sec,
    sample.reward_xu,
    sample.budget_xu,
    sample.spent_xu,
    '2026-10-01',
    '2026-12-31',
    'ACTIVE',
    administrator.user_id,
    sample.created_at
FROM (VALUES
    (N'Game & Thể thao điện tử', 'adv.vng@gmail.com', N'Game nhập vai - Khám phá thế giới mới', 'https://www.youtube.com/watch?v=9bZkp7q19f0', 30, 10, 12000, 0, CAST('2026-10-15T09:00:00' AS DATETIME)),
    (N'Game & Thể thao điện tử', 'adv.vng@gmail.com', N'Thể thao điện tử - Khoảnh khắc thi đấu nổi bật', 'https://www.youtube.com/watch?v=JGwWNGJdvx8', 25, 8, 10000, 1200, CAST('2026-10-15T09:10:00' AS DATETIME)),
    (N'Game & Thể thao điện tử', 'adv.shopee@gmail.com', N'Trải nghiệm trò chơi mới dành cho game thủ', 'https://www.youtube.com/watch?v=CevxZvSJLk8', 35, 12, 15000, 2400, CAST('2026-10-15T09:20:00' AS DATETIME)),
    (N'Giáo dục & Khóa học trực tuyến', 'adv.vng@gmail.com', N'Học Python cơ bản qua ví dụ thực hành', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 30, 10, 8000, 0, CAST('2026-10-15T10:00:00' AS DATETIME)),
    (N'Giáo dục & Khóa học trực tuyến', 'adv.vng@gmail.com', N'JavaScript cho người mới bắt đầu', 'https://www.youtube.com/watch?v=W6NZfCO5SIk', 30, 10, 8000, 800, CAST('2026-10-15T10:10:00' AS DATETIME)),
    (N'Giáo dục & Khóa học trực tuyến', 'adv.vinamilk@gmail.com', N'Lập trình web - Xây dựng dự án đầu tiên', 'https://www.youtube.com/watch?v=PkZNo7MFNFg', 40, 15, 12000, 1500, CAST('2026-10-15T10:20:00' AS DATETIME)),
    (N'Thời trang & Làm đẹp', 'adv.shopee@gmail.com', N'Gợi ý phong cách thời trang hằng ngày', 'https://www.youtube.com/watch?v=YQHsXMglC9A', 25, 8, 9000, 0, CAST('2026-10-15T11:00:00' AS DATETIME)),
    (N'Thời trang & Làm đẹp', 'adv.shopee@gmail.com', N'Bí quyết chăm sóc da và làm đẹp', 'https://www.youtube.com/watch?v=fRh_vgS2dFE', 30, 10, 10000, 1000, CAST('2026-10-15T11:10:00' AS DATETIME)),
    (N'Thời trang & Làm đẹp', 'adv.shopee@gmail.com', N'Bộ sưu tập phong cách mới mùa này', 'https://www.youtube.com/watch?v=3tmd-ClpJxA', 20, 7, 7000, 700, CAST('2026-10-15T11:20:00' AS DATETIME)),
    (N'Ẩm thực & Đồ uống', 'adv.vinamilk@gmail.com', N'Công thức bữa sáng nhanh gọn tại nhà', 'https://www.youtube.com/watch?v=5qap5aO4i9A', 30, 10, 9000, 0, CAST('2026-10-15T13:00:00' AS DATETIME)),
    (N'Ẩm thực & Đồ uống', 'adv.vinamilk@gmail.com', N'Khám phá món ngon cho cả gia đình', 'https://www.youtube.com/watch?v=ScMzIvxBSi4', 35, 12, 11000, 900, CAST('2026-10-15T13:10:00' AS DATETIME)),
    (N'Ẩm thực & Đồ uống', 'adv.vinamilk@gmail.com', N'Pha chế đồ uống mát lạnh tại nhà', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 25, 8, 8000, 600, CAST('2026-10-15T13:20:00' AS DATETIME)),
    (N'Công nghệ & Thiết bị điện tử', 'adv.vng@gmail.com', N'Giới thiệu thiết bị công nghệ mới', 'https://www.youtube.com/watch?v=M7lc1UVf-VE', 30, 10, 10000, 0, CAST('2026-10-15T14:00:00' AS DATETIME)),
    (N'Công nghệ & Thiết bị điện tử', 'adv.shopee@gmail.com', N'Mẹo sử dụng máy tính hiệu quả', 'https://www.youtube.com/watch?v=8mAITcNt710', 30, 10, 10000, 1000, CAST('2026-10-15T14:10:00' AS DATETIME)),
    (N'Công nghệ & Thiết bị điện tử', 'adv.vinamilk@gmail.com', N'Khám phá phụ kiện công nghệ tiện ích', 'https://www.youtube.com/watch?v=2ePf9rue1Ao', 25, 8, 8000, 500, CAST('2026-10-15T14:20:00' AS DATETIME)),
    (N'Du lịch & Khách sạn', 'adv.shopee@gmail.com', N'Gợi ý điểm đến cho chuyến du lịch hè', 'https://www.youtube.com/watch?v=LsoLEjrDogU', 35, 12, 12000, 0, CAST('2026-10-15T15:00:00' AS DATETIME)),
    (N'Du lịch & Khách sạn', 'adv.vinamilk@gmail.com', N'Khám phá cảnh đẹp và trải nghiệm địa phương', 'https://www.youtube.com/watch?v=60ItHLz5WEA', 30, 10, 10000, 900, CAST('2026-10-15T15:10:00' AS DATETIME)),
    (N'Du lịch & Khách sạn', 'adv.vng@gmail.com', N'Kinh nghiệm chuẩn bị hành lý du lịch', 'https://www.youtube.com/watch?v=QH2-TGUlwu4', 25, 8, 8000, 400, CAST('2026-10-15T15:20:00' AS DATETIME))
) AS sample(category_name, advertiser_email, title, video_url, duration_sec, reward_xu, budget_xu, spent_xu, created_at)
JOIN dbo.ad_categories AS category ON category.category_name = sample.category_name
JOIN dbo.users AS advertiser ON advertiser.email = sample.advertiser_email
CROSS JOIN (
    SELECT user_id FROM dbo.users WHERE email = 'admin@youtubexu.vn'
) AS administrator
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.ads AS existing WHERE existing.video_url = sample.video_url
);

COMMIT TRANSACTION;
GO
