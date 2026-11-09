# BÁO CÁO TIẾN ĐỘ DỰ ÁN YOUTUBE XU
**Ngày lập:** 10/11/2026  
**Repository:** [lynhhihi27-oss/linhlinh](https://github.com/lynhhihi27-oss/linhlinh)  
**Nhánh chính:** `main`  
**Công nghệ theo README:** Next.js 14, React 18, JavaScript, Microsoft SQL Server.

> Báo cáo này được tổng hợp từ mã nguồn/README, lịch sử commit và trạng thái Issues đang có trên GitHub. Trạng thái đóng Issue là trạng thái quản lý công việc, không tự động chứng minh toàn bộ checklist đã được kiểm thử hoặc nghiệm thu.

## 1. Tổng quan tiến độ trên GitHub

| Hạng mục | Trạng thái ghi nhận | Ghi chú |
|---|---|---|
| Issue #1 – Tuần 1: Nền tảng, database, tài khoản | Closed – completed | Có commit nền tảng Next.js và script SQL Server |
| Issue #2 – Tuần 2: Quảng cáo, phiên xem, Xu | Closed – completed | Có module quảng cáo, phiên xem và quy tắc khóa nhận Xu khi chưa xác minh |
| Issue #3 – Tuần 3: Đổi quà, quản trị, tích hợp, kiểm thử | Closed – completed | Có luồng đổi quà, quản trị và các cải tiến nghiệp vụ |
| Issue #4 – Ví Xu | Closed – gộp vào Tuần 2 | Không tính là một hạng mục triển khai độc lập |
| Issue #5 – Đổi quà và trang quản trị | Closed – not planned/gộp | Theo dõi trong kế hoạch Tuần 3 |
| Issue #6 – Tích hợp, kiểm thử, bàn giao | Closed – not planned/gộp | Theo dõi trong các kế hoạch tuần |
| Issue #7 – Tuần 4: Hoàn thiện nghiệp vụ, UI, bảo mật, kiểm thử | Closed – completed | Có các commit cải tiến tập trung ngày 04/11 |
| Issue #8 – Sprint 5: Tối ưu, thống kê, tự động hóa và 5 chức năng mở rộng | Open | Là kế hoạch đang chờ triển khai; chưa có bằng chứng commit triển khai các chức năng mới |

## 2. Những công việc đã có bằng chứng trong mã nguồn và lịch sử commit

### 2.1. Nền tảng hệ thống và cơ sở dữ liệu
- Khởi tạo ứng dụng full-stack bằng Next.js 14 App Router.
- Xây dựng giao diện và API nền tảng cho đăng nhập/đăng xuất, quảng cáo, phần thưởng, ví và quản trị.
- Bổ sung script T-SQL `youtube_xu_database.sql` cho Microsoft SQL Server.
- README mô tả schema cơ sở dữ liệu theo hướng chuẩn hóa 3NF, các khóa và chỉ mục.
- Có hướng dẫn cấu hình SQL Server, ODBC Driver 18 và chạy ứng dụng trên Windows.

Commit tiêu biểu:
- [145765c – Add Next.js fullstack app (Sprint 1)](https://github.com/lynhhihi27-oss/linhlinh/commit/145765c226c11a1e29610f60e0c2195a78c76e81)
- [91822d1 – Add youtube_xu_database.sql script for SQL Server](https://github.com/lynhhihi27-oss/linhlinh/commit/91822d19765e37b29a4570a0c8fd8029cd717b2a)

### 2.2. Tài khoản, xác thực và phân quyền
- Có luồng đăng nhập/đăng xuất và phiên đăng nhập bằng cookie HttpOnly, SameSite=Lax.
- Backend đọc danh tính và vai trò từ cơ sở dữ liệu khi xử lý API; không chỉ tin role/UserID do frontend gửi lên.
- Mật khẩu được băm bằng scrypt theo README.
- Có phân quyền cho Viewer, Advertiser và Admin.
- Có kiểm tra dữ liệu đầu vào và chuẩn hóa lỗi máy chủ theo các commit đã ghi nhận.

Commit tiêu biểu:
- [6b9c4eb – Secure account sessions and role-based APIs](https://github.com/lynhhihi27-oss/linhlinh/commit/6b9c4eb6405a155346410e2b1f583a833b1484fb)
- [5b19a82 – Validate API input and sanitize server errors](https://github.com/lynhhihi27-oss/linhlinh/commit/5b19a82a8d96eb4a0425ead12592f12d376846c5)

### 2.3. Quảng cáo và chiến dịch
- Có danh sách chiến dịch/quảng cáo và dữ liệu video mẫu theo danh mục.
- Có chức năng nhắm mục tiêu tuổi tối thiểu/tối đa theo mô tả trong README.
- Nhà quảng cáo có thể quản lý trạng thái chiến dịch của chính mình: tạm dừng, tiếp tục hoặc kết thúc theo quy tắc hệ thống.
- Admin có luồng duyệt/từ chối chiến dịch đang chờ.
- Bổ sung tìm kiếm chiến dịch theo tiêu đề, nhà quảng cáo hoặc danh mục.
- Bổ sung bộ lọc danh mục và giữ lại bộ lọc hiện có.
- Có sửa lỗi tạo chiến dịch theo transaction để hạn chế dữ liệu tạo dở dang.

Commit tiêu biểu:
- [3b89f98 – Add age targeting and referral rewards](https://github.com/lynhhihi27-oss/linhlinh/commit/3b89f980e53baedf6824a586bd77a9d0b90ebeac)
- [4bae673 – Add categorized demo video campaigns](https://github.com/lynhhihi27-oss/linhlinh/commit/4bae673f87ea12f2d95fe5a4c6bf75a1b2f56c53)
- [4ccf4b4 – Add safe advertiser campaign controls](https://github.com/lynhhihi27-oss/linhlinh/commit/4ccf4b4baf1ba88e9caaafadad93671cef4a78ea)
- [7fbf155 – Make campaign creation atomic](https://github.com/lynhhihi27-oss/linhlinh/commit/7fbf1559f807b37aa0c6a60b4c34cb5cd8ef9ac4)
- [136859a – Add campaign search and category filtering](https://github.com/lynhhihi27-oss/linhlinh/commit/136859ae909988ecffefbc5493428399b3c58da4)

### 2.4. Ví Xu, giao dịch và đổi quà
- Có trang ví và lịch sử giao dịch; README ghi nhận lịch sử ví tải theo trang 25 giao dịch, hỗ trợ lọc loại giao dịch và tải thêm.
- Có luồng đổi quà với kiểm tra điều kiện, giữ chỗ Xu và tồn kho trong trạng thái chờ.
- Có migration hỗ trợ idempotency cho yêu cầu đổi quà để tránh trừ Xu/tồn kho lặp khi gửi lại cùng request key.
- Có cải tiến quy trình ví và hồ sơ người dùng.
- Quy trình duyệt đổi quà yêu cầu Admin nhập mã quà thực do nhà cung cấp cấp; hệ thống không tự sinh mã quà giả.

Commit tiêu biểu:
- [575e139 – Make reward flows verifiable and idempotent](https://github.com/lynhhihi27-oss/linhlinh/commit/575e139084875154d3f3ab8d41ea2c379cfdadab)
- [c56df8c – Improve wallet and profile workflows](https://github.com/lynhhihi27-oss/linhlinh/commit/c56df8c75cb254dc06a305896d8fe420dc0e2f3c)
- [916ada8 – Configure filtered index migration options](https://github.com/lynhhihi27-oss/linhlinh/commit/916ada8cc69e5088f0d70ed4690e578ae3ecb4e5)

### 2.5. Giao diện và trải nghiệm
- Có cải tiến giao diện tổng thể và nội dung tiếng Việt.
- Có cải tiến responsive UI.
- Thay thế một số hộp thoại phần thưởng mặc định bằng giao diện phù hợp hơn.
- Có dữ liệu video và hàm hiển thị nội dung theo danh mục.

Commit tiêu biểu:
- [f7a0429 – Improve responsive UI and configure linting](https://github.com/lynhhihi27-oss/linhlinh/commit/f7a04297a2a8dccb9ce2e346862363de7785bd8a)
- [c80ceb2 – Refresh website design and polish Vietnamese copy](https://github.com/lynhhihi27-oss/linhlinh/commit/c80ceb26f876d47592584e717cbb2efc5e80efeb)
- [5f02dd3 – Replace native reward dialogs](https://github.com/lynhhihi27-oss/linhlinh/commit/5f02dd3ca27b37711e848470510cf661057a4818)
- [21cb811 – Add video data and render function for categories](https://github.com/lynhhihi27-oss/linhlinh/commit/21cb8110ba5b46fff846c9e7260873fb956dd236)

### 2.6. Kiểm thử và tài liệu
- Có bộ test hồi quy tập trung tại `tests/09-ads-status.test.mjs`.
- Theo README, test gọi route handler thật nhưng sử dụng SQLite trong bộ nhớ; mục đích là kiểm tra logic, không ghi dữ liệu vào SQL Server.
- Các nội dung test được mô tả gồm trạng thái/quyền sở hữu chiến dịch, phân trang ví, transaction tạo chiến dịch và cập nhật hồ sơ.
- Có commit ghi nhận các kiểm tra hồi quy tập trung cho Issue #7.
- README có hướng dẫn cài đặt, cấu hình, tài khoản demo và giới hạn tính năng.

Commit tiêu biểu:
- [d050b74 – Document focused issue 7 regression checks](https://github.com/lynhhihi27-oss/linhlinh/commit/d050b74fee913d713fe1b7edac8a0a13548b271d)

## 3. Các giới hạn cần nêu trung thực khi báo cáo/demo

1. **Chưa xác minh lượt xem quảng cáo thật:** README xác nhận hệ thống hiện chỉ đo thời gian từ lúc mở phiên và chưa tích hợp API xác minh từ YouTube/nhà cung cấp quảng cáo. Vì vậy nhận Xu từ quảng cáo đang bị khóa ở cả giao diện và API; bộ đếm thời gian không được xem là bằng chứng đã xem quảng cáo.
2. **Dữ liệu demo:** Tài khoản, quảng cáo, phần thưởng và giao dịch trong script khởi tạo là dữ liệu mẫu phục vụ trình diễn, không phải dữ liệu người dùng hay mã quà thực tế.
3. **Kiểm thử SQL Server:** Bộ test hồi quy hiện dùng SQLite trong bộ nhớ. Chưa thể coi đây là kiểm thử tích hợp trên SQL Server thật.
4. **Chưa có bằng chứng CI/build end-to-end trong báo cáo này:** Lịch sử commit và README được kiểm tra, nhưng chưa chạy ứng dụng trong môi trường local hoặc xác nhận workflow CI thành công tại thời điểm lập báo cáo.
5. **Pull Request:** Kết quả tra cứu hiện tại không trả về Pull Request nào trong repository. Cần kiểm tra lại nếu nhóm đã tạo PR sau thời điểm dữ liệu được truy xuất.

## 4. Công việc Sprint 5 đang lên kế hoạch, chưa xác nhận đã hoàn thành

Issue #8 đang mở. Ngoài mục tiêu tối ưu kiến trúc, hiệu năng, dashboard thống kê, log, CI/CD và tài liệu triển khai, nhóm đã bổ sung 5 chức năng mở rộng:

1. Hệ thống thông báo.
2. Bảng xếp hạng.
3. Nhiệm vụ hằng ngày.
4. Trung tâm hỗ trợ/khiếu nại giao dịch.
5. Báo cáo thống kê cho nhà quảng cáo và Admin.

Các chức năng trên hiện là yêu cầu trong Issue #8; không đưa vào danh sách chức năng đã hoàn thành cho đến khi có code, commit, test và bằng chứng nghiệm thu.

## 5. Đề xuất công việc tiếp theo

- [ ] Đối chiếu từng checklist Issue #7 với code và kết quả chạy thực tế; cập nhật trạng thái task chính xác.
- [ ] Chạy lint, test và build trên môi trường dự án; lưu lại log/kết quả.
- [ ] Kiểm thử kết nối và các luồng nghiệp vụ trên SQL Server thật.
- [ ] Ưu tiên triển khai từng chức năng Sprint 5 qua branch và Pull Request riêng.
- [ ] Bổ sung test phân quyền, giao dịch trùng, dữ liệu sai và các trường hợp lỗi.
- [ ] Chỉ bật nhận Xu khi có cơ chế xác minh lượt xem hợp lệ.
- [ ] Cập nhật báo cáo sau mỗi lần merge PR để phản ánh đúng tiến độ.

## 6. Kết luận

Repository hiện đã có nền tảng ứng dụng YouTube Xu, database SQL Server, tài khoản và phân quyền, module chiến dịch quảng cáo, ví Xu, đổi quà, giao diện theo vai trò và một số kiểm thử hồi quy. Các commit ngày 04/11/2026 thể hiện đợt cải tiến gần nhất tập trung vào quản lý chiến dịch, ví/hồ sơ, transaction tạo chiến dịch, migration và kiểm thử.

Sprint 1–4 được quản lý là đã đóng trên GitHub; Sprint 5 đang mở và là kế hoạch phát triển tiếp theo. Báo cáo không khẳng định các luồng đã được kiểm thử end-to-end trên SQL Server hoặc đã xác minh quảng cáo thật khi chưa có bằng chứng tương ứng.
