# linhlinh

Ứng dụng **YouTube Xu - Xem quảng cáo nhận xu** sử dụng Next.js và Microsoft SQL Server.

## Chạy local trên Windows

Yêu cầu Node.js 18.17 trở lên, SQL Server và Microsoft ODBC Driver 18 for SQL Server. Tài khoản Windows hiện tại cần được phép kết nối tới SQL Server bằng Windows Authentication.

Mặc định ứng dụng kết nối tới `localhost\SQLEXPRESS`, cơ sở dữ liệu `youtube_xu`.

1. Cài dependencies:

   ```powershell
   npm ci
   ```

2. Khởi tạo cơ sở dữ liệu và dữ liệu mẫu:

   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\youtube_xu_database.sql"
   ```

   **Lưu ý:** Script sẽ xóa và tạo lại cơ sở dữ liệu `youtube_xu`. Không chạy nếu cần giữ dữ liệu hiện có.

   Nếu đã có cơ sở dữ liệu và muốn giữ dữ liệu, chỉ áp dụng migration mã giới thiệu:

   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\migrations\20261020_add_referral_codes.sql"
   ```

3. Chạy ứng dụng:

   ```powershell
   npm run dev
   ```

   Mở [http://localhost:3000](http://localhost:3000). Tài khoản demo: `admin@youtubexu.vn`, mật khẩu `123456`.

Có thể đặt `DB_HOST` và `DB_NAME` để đổi máy chủ hoặc tên cơ sở dữ liệu mặc định.

## Nhắm mục tiêu quảng cáo và giới thiệu bạn bè

- Nhà quảng cáo có thể đặt tuổi tối thiểu/tối đa (16-120); người xem chỉ thấy chiến dịch phù hợp với năm sinh đã đăng ký. Chiến dịch không đặt khoảng tuổi vẫn hiển thị cho mọi người.
- Mỗi tài khoản có mã giới thiệu riêng. Khi người được mời hoàn tất xem một quảng cáo hợp lệ, người mời nhận thêm 10% số xu thưởng của lượt xem; số xu được làm tròn đến số nguyên gần nhất, tối thiểu 1 xu. Tiền thưởng và sổ cái được cập nhật cùng giao dịch hoàn tất lượt xem.
- Các tài khoản mẫu dùng mã giới thiệu `YX00000001` đến `YX00000010`. Có thể xem và sao chép mã cá nhân tại tab **Ví xu**.

## Cơ sở dữ liệu

[`youtube_xu_database.sql`](youtube_xu_database.sql) là script T-SQL tạo schema 3NF, khóa, chỉ mục và dữ liệu mẫu.