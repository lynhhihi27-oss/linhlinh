# SPRINT 6 — Hoàn thiện MVP thực tế cho YouTube Xu

**Dự án:** YouTube Xu  
**Mục tiêu Sprint:** Hoàn thiện độ tin cậy, bảo mật và trải nghiệm để chạy thử nghiệm nội bộ.  
**Nền tảng:** Next.js 14, React 18, Microsoft SQL Server (T-SQL).

## 1. Mục tiêu
1. Sửa và kiểm thử xác thực, phân quyền, quyền sở hữu dữ liệu.
2. Bảo đảm giao dịch Xu/đổi quà không bị lặp khi gửi request nhiều lần hoặc đồng thời.
3. Chỉ cộng Xu khi lượt xem được backend xác minh hợp lệ.
4. Minh bạch lịch sử Xu, hỗ trợ tra soát.
5. Hoàn thiện đổi quà, báo cáo nhà quảng cáo và trải nghiệm người dùng.
6. Kiểm thử hồi quy, bảo mật, responsive và tài liệu triển khai.

**Ngoài phạm vi:** Không giả lập lượt xem thành lượt xem hợp lệ; không tự tạo mã voucher thật. Khi chưa có API nhà cung cấp, giữ chế độ sandbox và khóa phát Xu thật.

## 2. Phân công 5 thành viên
Điền GitHub username thật rồi gán vào các issue tương ứng. Không tự đoán username.

| Thành viên | Module | Nhiệm vụ | GitHub username |
|---|---|---|---|
| Thành viên 1 | Authentication & Security | Session, role, quyền sở hữu API, kiểm thử truy cập chéo | Chờ xác nhận |
| Thành viên 2 | Ads & Verification | Luồng xem quảng cáo, callback xác minh, giới hạn và chống request giả/lặp | Chờ xác nhận |
| Thành viên 3 | Wallet & Rewards | Sổ cái Xu, idempotency, đổi quà, lịch sử và tra soát | Chờ xác nhận |
| Thành viên 4 | Admin & Advertiser | Quản trị, báo cáo, cảnh báo ngân sách, xuất dữ liệu | Chờ xác nhận |
| Thành viên 5 | QA, Integration & UX | Automated tests, timezone, responsive, tích hợp và tài liệu | Chờ xác nhận |

Mỗi thành viên phải có thay đổi code hoặc test thực tế, branch và PR riêng. Thành viên QA cũng phải viết test và sửa lỗi tích hợp, không chỉ viết tài liệu.

## 3. Backlog

### P0 — Bắt buộc

#### S6-01 — Bảo mật API và quyền sở hữu
- Danh tính/role lấy từ session phía server; không tin userId/role từ client.
- Người xem và nhà quảng cáo chỉ truy cập dữ liệu của mình; Admin mới được thao tác quản trị.
- Kiểm tra các API theo userId, campaignId, redemptionId.
- Test truy cập chéo tài khoản, sai role, session hết hạn.
- **Nghiệm thu:** request trái quyền bị từ chối; test quyền đạt.

#### S6-02 — Giao dịch Xu và đổi quà
- Rà soát transaction cho cộng/trừ Xu, giữ Xu, trừ tồn kho, cập nhật trạng thái.
- Dùng idempotency key để request lặp không tạo giao dịch lần hai.
- Xử lý đồng thời và rollback khi một bước thất bại.
- Mỗi giao dịch có mã tham chiếu, loại, số Xu, thời gian và trạng thái.
- **Nghiệm thu:** không trừ Xu/tồn kho hai lần; có test đồng thời và rollback.

#### S6-03 — Xác minh lượt xem quảng cáo
- Rà soát vòng đời phiên xem và heartbeat.
- Chỉ phát Xu sau khi backend xác minh callback/chữ ký từ nhà cung cấp đã tích hợp.
- Callback sai chữ ký hoặc gửi lặp phải bị từ chối/không phát thưởng lần hai.
- Chưa có nhà cung cấp thật thì giữ sandbox, không cộng Xu thật.
- **Nghiệm thu:** client không thể tự gọi API để nhận Xu.

#### S6-04 — Múi giờ Việt Nam
- Chuẩn hóa ngày nghiệp vụ theo Asia/Ho_Chi_Minh.
- Rà soát nhiệm vụ hằng ngày, giới hạn lượt xem, báo cáo.
- Test các thời điểm sát 00:00 giờ Việt Nam.
- **Nghiệm thu:** không tính nhầm ngày trước/sau.

### P1 — Hoàn thiện sản phẩm

#### S6-05 — Sổ Xu minh bạch và tra soát
- Mã tham chiếu cho từng giao dịch; hiển thị nguồn Xu, trạng thái, thời gian, ghi chú điều chỉnh.
- Lọc theo loại, trạng thái, khoảng thời gian.
- Người dùng gửi yêu cầu tra soát gắn với giao dịch; Admin phản hồi và lưu lịch sử.
- Không cho người dùng tự sửa số dư/tạo giao dịch.

#### S6-06 — Trung tâm đổi quà
- Hiển thị điều kiện đổi, số Xu, tồn kho, trạng thái yêu cầu.
- Lịch sử đổi quà có thời gian, hướng dẫn sử dụng và hạn dùng nếu nhà cung cấp cung cấp.
- Mã voucher chỉ hiển thị cho chủ sở hữu sau khi Admin xác nhận mã thật.
- Nếu chưa có nhà cung cấp, hiển thị rõ trạng thái thử nghiệm/chưa khả dụng; không tạo mã giả.

#### S6-07 — Trung tâm nhà quảng cáo
- Hiển thị ngân sách đã dùng/còn lại, lượt xem hợp lệ, chi phí trung bình, trạng thái chiến dịch.
- Cảnh báo ngân sách thấp/chiến dịch sắp kết thúc.
- Lọc theo chiến dịch và thời gian; xuất CSV/Excel nếu phù hợp.
- Nhà quảng cáo chỉ xem dữ liệu chiến dịch của mình; chỉ tính lượt xem đã xác minh.

#### S6-08 — Quyền riêng tư và phản hồi quảng cáo
- Cho phép xem/cập nhật tùy chọn cá nhân hóa phù hợp với dữ liệu hiện có.
- Giải thích nhà quảng cáo, lý do đề xuất và điều kiện nhận Xu.
- Cho phép phản hồi quảng cáo: không phù hợp, lặp lại hoặc báo cáo nội dung.
- Không thu thập dữ liệu nhạy cảm không cần thiết.

### P2 — Chỉ làm khi P0/P1 ổn định
- Mục tiêu tích lũy Xu để đổi quà.
- Danh sách chờ quà hết hàng và thông báo khi có hàng.
- A/B testing với báo cáo tổng hợp, không lộ dữ liệu cá nhân.
- Nhiệm vụ khảo sát/quiz có kiểm duyệt và chống gửi lặp.

## 4. Kế hoạch thực hiện
| Giai đoạn | Kết quả |
|---|---|
| Ngày 1 | Đọc repo, chạy lint/build/test, ghi nhận lỗi thực tế trên commit mới nhất |
| Ngày 2–3 | Hoàn thành S6-01, S6-02 và test bảo mật/giao dịch |
| Ngày 4 | Hoàn thành S6-03, S6-04; xác nhận chế độ sandbox |
| Ngày 5–6 | Hoàn thành các mục P1 đã chọn |
| Ngày 7 | Tích hợp, regression, sửa lỗi, cập nhật tài liệu và demo |

## 5. Quy tắc kỹ thuật
- Giữ Next.js 14 + React 18 + SQL Server; dùng T-SQL, không chuyển sang MySQL.
- Đọc README, package.json, app/, lib/, migrations/, tests/ trước khi sửa.
- Không chạy script khởi tạo database trên DB có dữ liệu cần giữ; script gốc có thao tác tạo lại database.
- Migration mới phải bảo toàn dữ liệu.
- Không commit .env.local, mật khẩu, token, API key hoặc dữ liệu cá nhân.
- Không viết lại toàn bộ hệ thống nếu chỉ cần sửa một module.
- Mỗi task có branch feat/s6-... hoặc fix/s6-..., PR riêng về main.
- Commit theo Conventional Commits.
- Không đánh dấu hoàn thành nếu chưa chạy test và ghi kết quả.

## 6. Lệnh kiểm tra Windows PowerShell
    npm.cmd ci
    npm.cmd run lint
    npm.cmd run build
    node --test --import ./tests/setup/register.mjs tests/10-sprint5-features.test.mjs

Chạy thêm test liên quan trong tests/ theo module được sửa. Nếu test chưa tồn tại hoặc lỗi môi trường, ghi rõ; không tự báo PASS.

## 7. Definition of Done
- [ ] P0 được tái hiện, sửa và có test hồi quy.
- [ ] API kiểm tra session, role và quyền sở hữu ở server.
- [ ] Giao dịch Xu/đổi quà an toàn với request lặp, đồng thời và rollback.
- [ ] Không phát Xu từ lượt xem chưa xác minh.
- [ ] Quy tắc ngày được test theo múi giờ Việt Nam.
- [ ] Giao diện có loading/empty/error/success và responsive.
- [ ] npm.cmd run lint đạt.
- [ ] npm.cmd run build đạt.
- [ ] Test liên quan đạt và kết quả ghi trong PR.
- [ ] Migration/tài liệu được cập nhật nếu cần.
- [ ] Mỗi thành viên có ít nhất một PR được review trước khi merge.

## 8. Liên kết
- Issue tổng Sprint 6: https://github.com/lynhhihi27-oss/linhlinh/issues/9
- Repository: https://github.com/lynhhihi27-oss/linhlinh
