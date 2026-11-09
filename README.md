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
   sqlcmd -S ".\SQLEXPRESS" -E -b -f i:65001 -i ".\migrations\20261110_add_sprint5_features.sql"
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
- Người dùng có thể sửa họ tên, số điện thoại, giới tính và tỉnh/thành trong tab **Hồ sơ**. Email và số dư không thể sửa từ giao diện hồ sơ.
- Sổ cái ví tải 25 giao dịch mỗi trang, hỗ trợ lọc theo loại và tải thêm; số liệu tổng vẫn tính trên toàn bộ giao dịch của tài khoản.
- Nhà quảng cáo có thể tạm dừng, tiếp tục hoặc kết thúc chiến dịch của chính mình. Admin chỉ duyệt/từ chối chiến dịch đang chờ; các trạng thái kết thúc không thể kích hoạt lại.
- Danh sách chiến dịch hỗ trợ tìm theo tiêu đề, nhà quảng cáo hoặc danh mục; bộ lọc danh mục hiện có vẫn được giữ nguyên.

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

## Chức năng Sprint 5

Sau khi áp dụng `migrations/20261110_add_sprint5_features.sql`, người dùng đã đăng nhập có thể mở **Tiện ích** trên thanh điều hướng:

- Thông báo hiển thị thông báo mới và số chưa đọc; có thể đánh dấu từng mục hoặc tất cả đã đọc.
- Bảng xếp hạng hiển thị Top 10 người xem theo tuần, tháng hoặc toàn thời gian. Chỉ tính giao dịch EARN/BONUS dương hợp lệ; không tính hoàn Xu/thu hồi, và Xu từ lượt xem chỉ hợp lệ khi lượt xem ở trạng thái COMPLETED.
- Nhiệm vụ hằng ngày chỉ nhận thưởng một lần mỗi nhiệm vụ/người/ngày. Nhiệm vụ đăng nhập và điểm danh dành cho người xem đã đăng nhập; nhiệm vụ quảng cáo cần lượt xem COMPLETED đã được máy chủ ghi nhận. API xác minh lượt xem hiện vẫn bị khóa, nên chưa thể hoàn thành nhiệm vụ quảng cáo.
- Người xem và nhà quảng cáo chỉ xem yêu cầu hỗ trợ của chính mình. Admin có thể tìm/lọc, phản hồi và đổi trạng thái.
- Nhà quảng cáo chỉ xem báo cáo chiến dịch của mình; Admin xem báo cáo hệ thống. Bộ lọc tuần/tháng tính từ đầu kỳ đến hiện tại, toàn thời gian hiển thị tổng và chuỗi biểu đồ 30 ngày gần nhất. CSV xuất chuỗi thời gian đang hiển thị.

Trang chức năng nằm tại `/features`. Migration chỉ thêm bảng và dữ liệu nhiệm vụ, không xóa hoặc tạo lại cơ sở dữ liệu.

## Cơ sở dữ liệu

[`youtube_xu_database.sql`](youtube_xu_database.sql) là script T-SQL tạo schema 3NF, khóa, chỉ mục và dữ liệu mẫu.

## Kiểm thử hồi quy tập trung

Yêu cầu Node.js 22.5 trở lên. Chạy các kiểm thử quyền sở hữu/trạng thái chiến dịch, phân trang ví, transaction tạo chiến dịch và cập nhật hồ sơ:

```powershell
node --import ./tests/setup/register.mjs --test ./tests/09-ads-status.test.mjs
```

Các kiểm thử gọi route handler thật nhưng dùng SQLite trong bộ nhớ để không ghi dữ liệu vào SQL Server. Đây là kiểm tra logic, không thay thế kiểm thử tích hợp trên SQL Server thật.

Kiểm thử API cho Sprint 5:

```powershell
node --test --import ./tests/setup/register.mjs tests/10-sprint5-features.test.mjs
```

## Quy ước đóng góp

### Commit

Đặt tiêu đề commit theo Conventional Commits: `<type>(<scope>): <mô tả ngắn>`. Dùng động từ, nêu rõ thay đổi và tránh gộp nhiều mục đích không liên quan vào một commit.

| Loại | Dùng khi | Ví dụ |
| --- | --- | --- |
| `feat` | Thêm chức năng | `feat(wallet): add transaction filters` |
| `fix` | Sửa lỗi | `fix(redeem): prevent duplicate requests` |
| `test` | Thêm hoặc cập nhật kiểm thử | `test(ads): cover campaign ownership` |
| `docs` | Chỉ thay đổi tài liệu | `docs(readme): document local setup` |
| `refactor` | Tái cấu trúc, không đổi hành vi | `refactor(auth): share session lookup` |
| `chore` | Công việc cấu hình/bảo trì | `chore(deps): update lint tooling` |

### Branch và Pull Request

- Không commit trực tiếp lên `main`. Tạo branch mới từ `main` đã cập nhật.
- Đặt tên branch theo `<type>/<mô-tả-ngắn>` bằng chữ thường và dấu gạch ngang, ví dụ `feat/wallet-history`, `fix/redeem-idempotency`, `docs/contributing`.
- Giữ mỗi branch/PR tập trung vào một mục tiêu; chia nhỏ thay đổi độc lập và liên kết issue liên quan.
- Mở PR vào `main`, mô tả vấn đề, cách giải quyết, cách kiểm thử và các tác động cần lưu ý. Đính kèm ảnh hoặc video khi thay đổi giao diện.
- Chờ review và các kiểm tra bắt buộc đạt trước khi merge. Giải quyết góp ý; không force-push nhánh dùng chung nếu chưa thống nhất với cộng tác viên.
- Không đưa secret, dữ liệu người dùng hoặc cấu hình môi trường vào commit. Migration phải bảo toàn dữ liệu; không chạy script khởi tạo có xóa database trên môi trường có dữ liệu cần giữ.

### Checklist review code

- [ ] Thay đổi đúng phạm vi PR, không làm mất hành vi hiện có ngoài chủ đích.
- [ ] Kiểm tra xác thực, phân quyền và quyền sở hữu dữ liệu ở backend; không tin dữ liệu nhạy cảm do client gửi.
- [ ] Truy vấn dùng đúng SQL Server/T-SQL; thao tác nhiều bước cần transaction và xử lý lỗi rõ ràng.
- [ ] Các thao tác cộng/trừ Xu, đổi quà và cập nhật tồn kho có tính idempotent, an toàn khi gửi đồng thời.
- [ ] Có kiểm thử cho luồng thành công, dữ liệu sai/thiếu, quyền bị từ chối và lỗi liên quan.
- [ ] Giao diện có trạng thái tải, lỗi/thành công và hiển thị phù hợp trên màn hình nhỏ khi cần.
- [ ] Không có secret, log nhạy cảm, thay đổi database phá hủy dữ liệu hoặc chức năng quảng cáo thưởng Xu chưa được xác minh thật.
- [ ] Tài liệu và migration được cập nhật nếu hành vi hoặc cách triển khai thay đổi.

### Checklist kiểm thử sau khi merge

- [ ] Cập nhật local `main` từ remote và cài dependencies theo lockfile (`npm.cmd ci`).
- [ ] Chạy lint: `npm.cmd run lint`.
- [ ] Chạy build production: `npm.cmd run build`.
- [ ] Chạy kiểm thử hồi quy tập trung: `node --import ./tests/setup/register.mjs --test ./tests/09-ads-status.test.mjs`.
- [ ] Nếu PR thêm hoặc sửa test, chạy các test liên quan và ghi kết quả vào PR; không coi test chưa chạy là đạt.
- [ ] Với thay đổi database, áp dụng migration trên database kiểm thử có backup và xác minh schema/dữ liệu; không chạy script khởi tạo xóa database trên dữ liệu cần giữ.
- [ ] Khởi động ứng dụng và kiểm tra nhanh luồng bị ảnh hưởng, quyền theo vai trò, lỗi API và giao diện responsive.
- [ ] Theo dõi CI/log sau merge; nếu phát hiện hồi quy, báo nhóm và tạo PR sửa lỗi hoặc rollback theo quy trình đã thống nhất.