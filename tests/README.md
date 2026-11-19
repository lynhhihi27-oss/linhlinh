# Bộ kiểm thử tự động – YouTube Xu

Bộ test này gọi **trực tiếp các route handler thật** trong `app/api/**/route.js` và chạy các câu SQL qua một adapter SQLite chạy trong bộ nhớ (dựng theo schema của nhóm). Đây không phải kiểm thử tích hợp Microsoft SQL Server. Nhờ vậy:

- Không cần kết nối SQL Server để kiểm tra logic route.
- Không sửa một dòng nào trong mã nguồn của ứng dụng.

## Cách chạy

Yêu cầu: **Node.js 22.5 trở lên** (khuyến nghị 22 LTS hoặc 24 LTS). Kiểm tra bằng `node --version`.

Giải nén thư mục `tests/` vào **thư mục gốc dự án** (cùng cấp với `app/`, `lib/`, `package.json`), rồi chạy:

```bash
node tests/run.mjs                                  # chạy tất cả
node tests/run.mjs --test-name-pattern="TC-013"     # chạy riêng test có tên chứa TC-013
node tests/run.mjs --json                           # ghi thêm kết quả từng test ra tests/results.json
```

Muốn dùng `npm test`, thêm hai dòng vào mục `scripts` của `package.json`:

```json
"test": "node tests/run.mjs",
"test:json": "node tests/run.mjs --json"
```

- Xem log lỗi nội bộ của route handler: `TEST_VERBOSE=1 node tests/run.mjs` (PowerShell: `$env:TEST_VERBOSE=1; node tests/run.mjs`).
- Mã thoát khác 0 khi còn test không đạt (dùng được trong CI).

## Cách đọc kết quả

- `✔` = ứng dụng làm đúng. `✖` = ứng dụng sai so với TC-01 / API-01 / SYS-02 / TEST-01; dòng thông báo bên dưới cho biết thực tế khác gì.
- Mã test:

| Tiền tố | Nội dung | Căn cứ |
|---|---|---|
| `TC-xxx` | đúng mã trong `Sprint/sprint3/TC-01.xlsx` | TC-01 |
| `EXT-xx` | bổ sung: giá trị biên, đầu vào xấu, gọi đồng thời, rollback khi CSDL lỗi | TEST-01 §Rà soát và bổ sung |
| `SEC-xx` | bảo mật: xác thực, phân quyền, truy cập chéo, mật khẩu | TEST-01 §Kiểm thử bảo mật, API-01 §Xác thực |
| `CT-xx` | hợp đồng API-01 (mã HTTP, định dạng lỗi) | API-01 |
| `INT-xx` | script CSDL khớp với code; đối soát sổ cái xu với số dư | TEST-01 §Kiểm thử số dư |
| `AFF-xx` | hoa hồng giới thiệu (ngoài TC-01 nhưng ảnh hưởng số dư xu) | mã nguồn |
| `SMOKE-xx` | kiểm tra bộ test tự chạy được | – |

- Một lỗi gốc có thể làm nhiều test không đạt (ví dụ `SEC-13…SEC-27` cùng do chưa có xác thực). Danh sách lỗi đã gom theo nguyên nhân nằm trong `TC-01_KetQua.xlsx`, sheet “Danh sách lỗi”.

## Cách hoạt động

| File | Việc làm |
|---|---|
| `setup/register.mjs` | nạp trước mọi test: kiểm tra phiên bản Node, đăng ký hook, tắt log lỗi |
| `setup/hooks.mjs` | đổi `@/lib/db` → `fake-db.mjs`, `next/server` → `next-server-stub.mjs` |
| `setup/fake-db.mjs` | SQLite thay `lib/db.js` trong test: dịch một phần cú pháp T-SQL/SQL ứng dụng; mỗi transaction chạy tuần tự (mô phỏng khóa dòng); `injectFault()` ép CSDL lỗi giữa chừng; đếm kết nối bị “rò” (transaction không đóng) |
| `setup/schema.mjs` | DDL tương đương `youtube_xu_database.sql` (thêm cột `users.referral_code` mà code đang dùng) cùng các ràng buộc `CHECK`/`UNIQUE` |
| `helpers.mjs` | `call()` gọi route; dữ liệu mẫu `seedBase()`; `start/complete/watchFully/redeem`; `backdate()` lùi giờ bắt đầu để giả lập thời gian trôi (không phải chờ thật); `ledgerViolations()` đối soát sổ cái |
| `0x-*.test.mjs` | các test; mỗi test chạy trên CSDL mới |

## Giới hạn cần biết

1. **SQLite ≠ Microsoft SQL Server.** Kiểu dữ liệu, collation, kiểm tra độ dài, transaction, locking và cú pháp T-SQL có thể khác. Kết quả là bằng chứng về *logic*, không thay thế kiểm thử tích hợp trên SQL Server thật.
2. **Đồng thời:** transaction được xếp hàng tuần tự nên mô hình `SELECT … FOR UPDATE` được giả định hoạt động đúng. Các truy vấn nằm ngoài transaction (ví dụ `views/start`) vẫn xen kẽ thật.
3. **Chưa phủ:** giao diện React, hiệu năng 500 người xem (TC-046), responsive di động (TC-047). TC-014 chỉ được kiểm tra bằng đọc mã nguồn giao diện.
4. **Xác thực:** các test phân quyền dùng cookie phiên HMAC ký bằng `createSessionCookie()` trong helper `as()`. Header `x-user-id`, query parameter và dữ liệu trong request body không được xem là danh tính.
5. Các test `EXT/SEC/CT/INT/AFF` phản ánh cách hiểu yêu cầu của người viết test. Nếu nhóm quyết định yêu cầu khác (ví dụ chấp nhận mã 400 thay vì 409) thì sửa test và tài liệu cho khớp thay vì sửa mã.

## Sau khi sửa lỗi

Chạy lại `node tests/run.mjs`: test chuyển từ `✖` sang `✔` là bằng chứng đã sửa. Với các test case giao diện và hiệu năng, chạy tay hoặc bằng k6/JMeter rồi cập nhật cột “Trạng thái” trong TC-01.xlsx. Không kết luận kiểm thử tích hợp SQL Server đạt khi chưa chạy trên database SQL Server thật.
