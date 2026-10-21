# linhlinh

Ứng dụng **YouTube Xu** quản lý chiến dịch quảng cáo, ví Xu và yêu cầu đổi quà; sử dụng Next.js và Microsoft SQL Server.

## Chạy local trên Windows

Yêu cầu Node.js 18.17 trở lên, SQL Server và Microsoft ODBC Driver 18 for SQL Server. Tài khoản Windows hiện tại cần được phép kết nối tới SQL Server bằng Windows Authentication.

Mặc định ứng dụng kết nối tới `localhost\SQLEXPRESS`, cơ sở dữ liệu `youtube_xu`.

1. Cài dependencies:

   ```powershell
   npm.cmd ci
   ```

2. Khởi tạo cơ sở dữ liệu và dữ liệu mẫu:

   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\youtube_xu_database.sql"
   ```

   **Lưu ý:** Script sẽ xóa và tạo lại cơ sở dữ liệu `youtube_xu`. Không chạy nếu cần giữ dữ liệu hiện có.

   Nếu đã có cơ sở dữ liệu và muốn giữ dữ liệu, áp dụng từng migration cần thiết (các migration này không xóa dữ liệu):

   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\migrations\20261020_add_referral_codes.sql"
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\migrations\20261022_add_redemption_idempotency.sql"
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\migrations\20261022_add_demo_video_campaigns.sql"
   ```

   Các migration không xóa dữ liệu hiện có. Migration video có thể chạy lại an toàn; migration đổi quà thêm cột khóa yêu cầu tùy chọn và unique index có lọc, các đơn cũ giữ nguyên `NULL`.

3. Chạy ứng dụng:

   ```powershell
   $hasSecret = $false
   if (Test-Path ".env.local") {
     $hasSecret = [bool](Select-String -Path ".env.local" -Pattern '^AUTH_SECRET=' -Quiet)
   }
   if (-not $hasSecret) {
     $bytes = New-Object byte[] 32
     $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
     $rng.GetBytes($bytes)
     "AUTH_SECRET=$([Convert]::ToBase64String($bytes))" | Add-Content -Path ".env.local" -Encoding ascii
     $rng.Dispose()
   }
   npm.cmd run dev
   ```

   Mở [http://localhost:3000](http://localhost:3000). Cơ sở dữ liệu mẫu có nhiều tài khoản để thử các vai trò:

   | Vai trò | Email đăng nhập | Người dùng |
   | --- | --- | --- |
   | Quản trị viên | `admin@youtubexu.vn` | Nguyễn Quản Trị |
   | Nhà quảng cáo | `adv.vng@gmail.com` | Công ty Cổ phần VNG |
   | Nhà quảng cáo | `adv.shopee@gmail.com` | Shopee Việt Nam |
   | Nhà quảng cáo | `adv.vinamilk@gmail.com` | Vinamilk Corporation |
   | Người xem | `long.tv@gmail.com` | Trần Văn Long |
   | Người xem | `nhi.lt@gmail.com` | Lê Thị Nhi |
   | Người xem | `tu.pm@gmail.com` | Phạm Minh Tú |
   | Người xem | `lam.hm@gmail.com` | Hoàng Mai Lâm |
   | Người xem | `luong.nv@gmail.com` | Nguyễn Văn Lượng |

   Mật khẩu cho các tài khoản mẫu đang hoạt động là `123456`. Tài khoản `gianlan.bot@gmail.com` bị khóa để phục vụ dữ liệu minh họa, không dùng để đăng nhập thử.

`AUTH_SECRET` dùng để ký phiên đăng nhập; cần giữ bí mật và đặt thành giá trị ngẫu nhiên riêng tối thiểu 32 ký tự ở mọi môi trường. Khối lệnh trên chỉ thêm giá trị nếu chưa có, không ghi đè các cấu hình khác. Không commit hoặc chia sẻ `.env.local`. Có thể đặt `DB_HOST` và `DB_NAME` để đổi máy chủ hoặc tên cơ sở dữ liệu mặc định.

## Tài khoản và phiên đăng nhập

- Đăng nhập tạo cookie phiên `HttpOnly`, `SameSite=Lax`, hết hạn sau 7 ngày; đăng xuất sẽ xóa cookie.
- Quyền và danh tính được đọc từ cơ sở dữ liệu ở backend cho mỗi API request; không thể đổi tài khoản bằng cách sửa `userId` hoặc `role` gửi từ trình duyệt.
- Tài khoản mới cần mật khẩu từ 8 ký tự. Mật khẩu được băm bằng scrypt; mật khẩu mẫu cũ `123456` chỉ dùng với tài khoản khởi tạo và được nâng cấp sang hash mới sau lần đăng nhập đầu tiên.
- Khách có thể xem danh sách quảng cáo; cần đăng nhập để đổi quà hoặc dùng ví.

## Giới hạn tính năng hiện tại

- Nhận Xu từ quảng cáo đang bị khóa ở cả giao diện và API. Máy chủ hiện chỉ có thể đo thời gian từ lúc mở phiên; chưa tích hợp API xác minh của YouTube hoặc nhà cung cấp quảng cáo nên không thể xác nhận video đã thực sự phát. Không có Xu nào được cộng từ bộ đếm thời gian.
- Các yêu cầu đổi quà giữ chỗ Xu và tồn kho ở trạng thái chờ. Quản trị viên chỉ được phê duyệt sau khi nhập mã quà thật do nhà cung cấp cấp; ứng dụng không tự sinh mã giả.
- API đổi quà yêu cầu migration `20261022_add_redemption_idempotency.sql` để lặp lại cùng request key không trừ Xu hoặc tồn kho lần nữa.
- Dữ liệu tài khoản, quảng cáo, quà và giao dịch trong script khởi tạo là dữ liệu mẫu phục vụ trình diễn, không phải hàng hóa/mã đổi quà thực tế.

## Nhắm mục tiêu quảng cáo và giới thiệu bạn bè

- Nhà quảng cáo có thể đặt tuổi tối thiểu/tối đa (16-120); danh sách hiện chỉ áp dụng lọc tuổi đã cấu hình.
- Danh sách video được tách riêng theo từng danh mục. Script khởi tạo có thêm 18 chiến dịch video mẫu đang hoạt động, chia đều 3 video cho mỗi danh mục.
- Mỗi tài khoản có mã giới thiệu riêng. Phần thưởng giới thiệu chỉ có thể được phát sau khi tích hợp và xác minh lượt xem hợp lệ; tính năng nhận Xu hiện bị khóa nên không phát sinh thưởng mới.
- Các tài khoản mẫu dùng mã giới thiệu `YX00000001` đến `YX00000010`. Có thể xem và sao chép mã cá nhân tại tab **Ví xu**.

## Cơ sở dữ liệu

[`youtube_xu_database.sql`](youtube_xu_database.sql) là script T-SQL tạo schema 3NF, khóa, chỉ mục và dữ liệu mẫu.