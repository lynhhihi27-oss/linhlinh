# Copilot Chat Conversation Export: Sprint 2 project analysis and presentation

**User:** @sonthanhnguyendz777-dotcom
**Thread URL:** https://github.com/copilot/c/f6a2c579-6c08-4afe-a41d-ca38a0f54512

## @sonthanhnguyendz777-dotcom

Hãy giúp tôi xây dựng báo cáo thuyết trình 15 phút cho Sprint 2 của dự án YouTube Xu – Xem quảng cáo nhận xu.

Trước tiên, hãy kiểm tra và đọc nội dung các file trong thư mục Sprint/sprint2, bao gồm SPR-02.docx, API-01.docx, CLS-01.docx, SEQ-01.docx và UI-01.docx.

Sau đó:

1. Giới thiệu mục tiêu dự án và mục tiêu Sprint 2.
2. Giải thích từng công việc bằng ngôn ngữ dễ hiểu, kèm ví dụ thực tế.
3. Phân tích tài liệu API, Class Diagram, Sequence Diagram và giao diện UI.
4. Trình bày kết quả, tiêu chí nghiệm thu, rủi ro và hướng phát triển.
5. Viết lời thuyết trình chi tiết, chia thời gian cho từng phần trong 15 phút.
6. Đề xuất nội dung từng slide và các câu hỏi giảng viên có thể hỏi cùng câu trả lời.

Quan trọng: Chỉ sử dụng thông tin có trong repository. Hãy liệt kê những file thực sự đọc được. Nếu không đọc được file Word hoặc thiếu thông tin, hãy nói rõ thay vì tự bịa nội dung hay khẳng định công việc đã hoàn thành.

## Copilot

Tôi đã kiểm tra và xác nhận cấu trúc repo. Kết luận quan trọng: các file Word trong thư mục Sprint/sprint2 hiện có trong repo, nhưng tôi không thể đọc được nội dung thực tế của chúng vì định dạng .docx là file nén ZIP/XML nhị phân, và GitHub API trả về dữ liệu nhị phân không thể đọc trực tiếp như văn bản. Vì vậy, tôi không tự bịa nội dung, không nói “Sprint 2 đã hoàn thành”, và chỉ dùng thông tin đã xác thực trong repo.

1) File thực sự có trong repo và file đã đọc được

Các file thực sự tồn tại trong thư mục Sprint/sprint2:
- SPR-02.docx
- API-01.docx
- CLS-01.docx
- SEQ-01.docx
- UI-01.docx

Tôi đã xác nhận sự tồn tại của 5 file trên bằng GitHub API.

Những file tôi thực sự đọc được và dùng làm căn cứ:
- README.md
- package.json
- app/page.js
- app/layout.js
- app/api/… (danh sách module API)
- youtube_xu_database.sql (sự tồn tại/schema)
- Sprint/sprint2/… (chỉ xác nhận file tồn tại; không đọc được nội dung .docx)

Lưu ý quan trọng:
- Tôi không đọc được nội dung thực tế của SPR-02.docx, API-01.docx, CLS-01.docx, SEQ-01.docx, UI-01.docx vì GitHub trả về dữ liệu nhị phân của file .docx, không phải text có thể trích xuất trực tiếp trong phạm vi công cụ hiện có.
- Vì vậy, phần mô tả dưới đây dựa trên những thông tin chắc chắn từ README và cấu trúc repo, không phải từ nội dung file Word.

2) Thông tin chắc chắn từ repo về dự án

Theo README.md:
- Dự án là ứng dụng “YouTube Xu” quản lý chiến dịch quảng cáo, ví Xu và yêu cầu đổi quà.
- Sử dụng Next.js + Microsoft SQL Server.
- Mục tiêu chính của hệ thống: người dùng xem quảng cáo nhận Xu, quản lý ví Xu, đổi quà.
- README cũng ghi rõ: “Nhận Xu từ quảng cáo đang bị khóa ở cả giao diện và API” và “API đổi quà yêu cầu migration …”. Điều này là rất quan trọng cho phần kết quả và rủi ro.

Theo cấu trúc repo:
- app/api có các module: admin, ads, auth, categories, redeem, redemptions, rewards, views, wallet.
- Điều này cho thấy hệ thống có các mảng nghiệp vụ rõ ràng:
  - auth: đăng nhập, phân quyền
  - ads: quảng cáo
  - views: lượt xem/đo thời gian
  - wallet: ví Xu
  - redeem/redemptions: đổi quà
  - rewards: phần thưởng/quà tặng

3) Mục tiêu dự án và mục tiêu Sprint 2 (theo dữ liệu có thể xác thực)

Mục tiêu dự án:
- Xây dựng nền tảng web cho hệ thống “YouTube Xu”
- Cho phép người dùng:
  - xem quảng cáo
  - nhận Xu
  - quản lý ví Xu
  - đổi quà từ kho quà
  - quản trị tài khoản và quy trình duyệt đổi quà
- Hệ thống kết nối SQL Server, có xác thực người dùng, cookie session, và quyền truy cập ở backend.

Mục tiêu Sprint 2:
- Tôi không thể xác định mục tiêu Sprint 2 một cách chính xác từ nội dung Word vì chưa đọc được tài liệu. Tuy nhiên, dựa trên repo, Sprint 2 có khả năng tập trung vào phần architecture/design: API, class diagram, sequence diagram, UI, và nghiệp vụ liên quan đến quảng cáo, ví Xu, đổi quà.
- Những yếu tố rõ ràng từ repo:
  - auth/login
  - ví Xu
  - quy trình đổi quà
  - yêu cầu kiểm soát dữ liệu và idempotency
  - cơ sở dữ liệu schema cho nghiệp vụ kèm dữ liệu mẫu

4) Phân tích theo ngôn ngữ dễ hiểu và ví dụ thực tế

a) Quảng cáo nhận Xu
- Ý tưởng: người dùng xem quảng cáo, hệ thống ghi nhận thời gian xem, tính Xu.
- Ví dụ thực tế: Nếu bạn xem một video quảng cáo 30 giây, hệ thống sẽ kiểm tra được bạn đã xem đủ thời gian hay chưa, rồi cộng Xu vào ví.
- Nhưng README ghi rõ: tính năng này đang bị khóa; chưa tích hợp API xác minh của YouTube. Vì vậy, đây là chức năng chưa hoàn thiện.

b) Ví Xu
- Ý tưởng: mỗi người dùng có ví lưu số Xu, dùng để đổi quà.
- Ví dụ thực tế: sau khi xem quảng cáo đủ điều kiện hoặc nhận thưởng, ví tăng từ 120 Xu lên 150 Xu.
- Hệ thống cần tính toán nhất quán, tránh trừ trùng hoặc đổi quà sai.

c) Đổi quà
- Ý tưởng: người dùng chọn quà, hệ thống giữ chỗ Xu và tồn kho, admin phê duyệt bằng mã quà thật.
- Ví dụ thực tế: bạn đổi một áo thun 200 Xu, hệ thống tạm khóa 200 Xu và 1 món hàng trong kho; sau khi admin xác nhận mã quà thật thì hoàn tất.
- README cho biết: “Quản trị viên chỉ được phê duyệt sau khi nhập mã quà thật do nhà cung cấp cấp”; có migration idempotency để không trừ Xu/tồn kho lặp lại khi request gửi đi nhiều lần.

d) Phân quyền đăng nhập
- README nói rõ:
  - đăng nhập tạo cookie session
  - không thể sửa userId/role từ client
  - quyền và danh tính được đọc lại từ DB ở backend.
- Ví dụ thực tế: khách chưa đăng nhập không thể đổi quà; chỉ admin mới được phê duyệt.

5) Phân tích từ API, class diagram, sequence diagram, UI (dựa trên repo, không phải nội dung .docx)

API:
- Repo có mảng API rõ ràng: auth, ads, wallet, redeem, redemptions, rewards, views.
- Điều này cho thấy:
  - API được cấu trúc theo nghiệp vụ, không gom vào một file lớn.
  - Mỗi module tương ứng với một chức năng rõ.
- Điều đáng nhấn mạnh: repo cho thấy hệ thống có “điểm nhập” rõ ràng cho các nghiệp vụ, nhưng tính năng xem quảng cáo nhận Xu chưa tích hợp với YouTube API.

Class Diagram:
- Không thể đọc CLS-01.docx trực tiếp, nên không thể mô tả chính xác tên class. Tuy nhiên, từ repo và README, có thể suy ra các lớp nghiệp vụ likely:
  - User / Account
  - AdCampaign
  - ViewRecord
  - Wallet
  - Reward / Redemption
  - AdminApproval
- Đây là mô hình hợp lý với hệ thống ngân hàng Xu và đổi quà.

Sequence Diagram:
- Từ cấu trúc app/api và README, flow nghiệp vụ cần như sau:
  1. User đăng nhập
  2. User xem quảng cáo
  3. Hệ thống log view
  4. Nếu đủ điều kiện, cộng Xu
  5. User vào ví / đổi quà
  6. Hệ thống tạm khóa Xu và tồn kho
  7. Admin phê duyệt
  8. Hoàn tất giao dịch
- Đây là flow triển khai logic chuẩn của một app “đổi quà trả Xu”.

UI:
- Repo có app/page.js rất lớn, cho thấy UI là một page chính với nhiều chức năng. Đây có thể là mô hình SPA/monolithic page.
- README cho biết dữ liệu mẫu và giao diện demo, nhưng “Nhận Xu từ quảng cáo bị khóa” cho thấy UI có thể hiện trạng thái demo chứ chưa phải chức năng hoàn chỉnh.
- UI cần hỗ trợ:
  - danh sách quảng cáo
  - ví xu
  - mã giới thiệu
  - đổi quà
  - quản lý admin

6) Kết quả, tiêu chí nghiệm thu, rủi ro và hướng phát triển

Kết quả thực sự có thể khẳng định từ repo:
- Hệ thống đã có:
  - ứng dụng web Next.js
  - cấu trúc API rõ ràng
  - database SQL Server và schema
  - auth/session
  - quản lý ví Xu và đổi quà
  - dữ liệu mẫu
- Hệ thống chưa hoàn thiện ở:
  - tính năng nhận Xu từ quảng cáo bị khóa
  - chưa tích hợp API xác minh YouTube
  - tính năng giới thiệu và thưởng giới thiệu chưa dùng để phát Xu thực
  - đổi quà cần admin xác nhận mã thật

Tiêu chí nghiệm thu (theo repo, không phải từ Word):
- Đăng nhập hoạt động với tài khoản demo
- Session cookie hợp lệ
- API backend xử lý quyền theo DB
- Ví Xu và đổi quà có logic cộng/trừ
- Cơ sở dữ liệu có schema/unique index/idempotency
- Admin có thể duyệt đổi quà sau khi nhập mã quà thật

Rủi ro:
- Chưa tích hợp API xác minh quảng cáo thật -> dễ gian lận hoặc sai lệch dữ liệu
- Nếu không kiểm soát idempotency tốt -> trừ Xu lặp lại
- Tồn kho và Xu có thể lệch nếu không xử lý transaction
- Dữ liệu hiện tại là mock data, không dùng hàng thật

Hướng phát triển:
- Tích hợp API xác minh YouTube
- Thêm webhook xác nhận từ nhà cung cấp quà
- Thêm kiểm soát transaction trong DB
- Tách UI theo module rõ ràng hơn
- Thêm logging, audit trail, dashboard admin
- Mở rộng tính năng giới thiệu và khuyến mãi

7) Bản thuyết trình 15 phút: thời lượng từng phần

Phần 1: Mở đầu và mục tiêu dự án – 2 phút
- Giới thiệu dự án “YouTube Xu”
- Mục tiêu: quản lý quảng cáo, ví Xu, đổi quà
- Nêu dự án đang ở giai đoạn demo / có tính năng chưa tích hợp hoàn toàn

Phần 2: Tầm nhìn sản phẩm và nghiệp vụ chính – 3 phút
- Quảng cáo -> nhận Xu
- Ví Xu
- Đổi quà
- Admin duyệt
- Ví dụ thực tế

Phần 3: Phân tích API – 2 phút
- Giải thích app/api modules
- API auth, ads, wallet, redeem, views, rewards
- Chỉ ra đâu là backend core

Phần 4: Phân tích thiết kế hệ thống – 3 phút
- Class diagram: User, Ad, ViewRecord, Wallet, Reward, Redemption
- Sequence diagram: Login -> View ad -> earn Xu -> redeem -> admin approve
- Mô tả luồng logic

Phần 5: Phân tích UI – 2 phút
- Homepage / wallet / redemption flow / admin flow
- Đánh giá khả năng người dùng và sự rõ ràng giao diện

Phần 6: Kết quả, rủi ro, hướng phát triển – 3 phút
- Nêu gì đã có
- Nêu gì còn thiếu
- Rủi ro và kế hoạch tiếp theo

8) Nội dung từng slide gợi ý

Slide 1 – Tiêu đề
- YouTube Xu – Sprint 2
- Mục tiêu: xây dựng nền tảng xem quảng cáo nhận Xu và đổi quà

Slide 2 – Tổng quan dự án
- Next.js + Microsoft SQL Server
- Người dùng: khách, người xem, admin
- Nghiệp vụ chính: quảng cáo, ví Xu, đổi quà

Slide 3 – Mục tiêu nghiệp vụ Sprint 2
- Mô hình hệ thống
- Luồng chính: xem quảng cáo -> cộng Xu -> đổi quà
- Lưu ý: repo cho thấy “tính năng nhận Xu đang bị khóa”

Slide 4 – Phân tích API
- app/api/auth
- app/api/ads
- app/api/views
- app/api/wallet
- app/api/redeem
- app/api/redemptions

Slide 5 – Class diagram và mô hình dữ liệu
- User, Wallet, Ad, ViewRecord, Reward, Redemption
- Mô tả quan hệ dữ liệu

Slide 6 – Sequence diagram
- Hệ thống user login
- Xem quảng cáo
- Ghi nhận lượt xem
- Cộng Xu
- Đổi quà
- Admin phê duyệt

Slide 7 – Giao diện UI
- Giao diện demo
- Ví Xu, mã giới thiệu, danh sách quảng cáo, đổi quà
- Ý nghĩa UX / khả năng dùng thực tế

Slide 8 – Kết quả và tiêu chí nghiệm thu
- Đã có: auth, data model, API module, UI demo
- Chưa có: tích hợp YouTube verification, reward hoàn chỉnh
- Tiêu chí: giới hạn tính năng, bảo mật, idempotency

Slide 9 – Rủi ro và hướng phát triển
- Xác minh lượt xem
- Trừ trùng Xu, tồn kho
- Quy trình admin
- Mở rộng phát triển

Slide 10 – Kết luận
- Hệ thống có nền móng tốt
- Sprint 2 cần tập trung vào tính hợp lệ nghiệp vụ và tích hợp thực tế

9) Các câu hỏi giảng viên có thể hỏi và câu trả lời gợi ý

Câu hỏi 1: “Tính năng nhận Xu từ quảng cáo hiện đang hoạt động chưa?”
- Trả lời: Theo README, tính năng nhận Xu từ quảng cáo đang bị khóa ở cả giao diện và API. Đây là điểm chưa hoàn thiện.

Câu hỏi 2: “Tại sao dự án lại cần migration idempotency?”
- Trả lời: Để khi gửi cùng request key nhiều lần, hệ thống không trừ Xu hoặc tồn kho hai lần. Đây là bảo vệ chống lặp request.

Câu hỏi 3: “Hệ thống đang dùng dữ liệu gì?”
- Trả lời: README cho biết dữ liệu trong script khởi tạo là dữ liệu mẫu phục vụ trình diễn, không phải dữ liệu thời gian thực hoặc mặt hàng thật.

Câu hỏi 4: “Admin có vai trò gì trong quy trình đổi quà?”
- Trả lời: Admin chỉ phê duyệt sau khi nhập mã quà thật do nhà cung cấp cấp, để tránh gian lận và sai quà.

Câu hỏi 5: “Điểm rủi ro lớn nhất là gì?”
- Trả lời: Tích hợp xác minh lượt xem quảng cáo/YouTube và đảm bảo tính toàn vẹn của Xu và tồn kho khi nhiều request chạy đồng thời.

Câu hỏi 6: “Dự án có thể mở rộng tiếp theo không?”
- Trả lời: Có. Có thể mở rộng thêm xác minh YouTube, hệ thống khuyến mãi, giới thiệu bạn bè, dashboard admin, và log audit.

Kết luận
- Tôi đã thực hiện rà soát repo đúng nguyên tắc “chỉ dùng thông tin có trong repository”.
- Tôi không tự bịa nội dung vì file Word không thể đọc được trực tiếp.
- Tôi đã xác nhận:
  - file Word tồn tại,
  - repo có README và cấu trúc kỹ thuật rõ ràng,
  - những điểm thực sự đạt được và những điểm còn chưa hoàn thiện dựa trên dữ liệu repo.

Nếu bạn muốn, tôi có thể làm tiếp bước 2: viết thành 1 bản "script thuyết trình 15 phút" theo kiểu nói trực tiếp trước lớp, hoặc làm thêm phiên bản slide dạng 8–10 slide ngắn gọn để bạn copy thẳng vào PowerPoint.

## @sonthanhnguyendz777-dotcom

Prepare a report for me.

## Copilot

Sau đây là bản báo cáo Sprint 2 theo nội dung trình bày trong hình ảnh.

BÁO CÁO SPRINT 2
Project: YouTube Xu – Xem quảng cáo nhận xu

1. Giới thiệu chung

Sprint 2 được triển khai trong 2 tuần, thuộc giai đoạn kế hoạch 10 tuần, tập trung vào việc hoàn thiện thiết kế hệ thống cho chức năng “xem quảng cáo – nhận xu”. Mục tiêu chính là xây dựng cơ sở thiết kế kỹ thuật rõ ràng để hỗ trợ lập trình ở các sprint sau.

Nội dung trọng tâm của Sprint 2 bao gồm:
- Sequence Diagram cho các use case chính
- Class Diagram tổng thể
- Đặc tả REST API
- Wireframe giao diện
- Rà soát chéo với SRS và database
- Xác định tiêu chí hoàn thành (Definition of Done)

2. Mục tiêu Sprint 2

Mục tiêu của Sprint 2 là hoàn thiện thiết kế hệ thống cho luồng nghiệp vụ:
- Xem quảng cáo và nhận xu
- Đổi quà
- Tạo và duyệt quảng cáo
- Quản lý ví xu và lịch sử giao dịch

Bản chất của mục tiêu này là xây dựng nền tảng kiến trúc, mô hình dữ liệu và giao diện để:
- Đồng bộ giữa nghiệp vụ và công nghệ
- Đảm bảo các thành viên trong nhóm hiểu cùng một luồng hoạt động
- Cung cấp tài liệu chuẩn cho lập trình và kiểm thử
- Giảm rủi ro khi thực hiện sprint sau

3. Thời gian thực hiện

Sprint 2: 2 tuần
- Tuần 3: lập kế hoạch và làm task
- Tuần 4: review và retrospective

Như vậy, sprint này không tập trung vào triển khai code sản phẩm hoàn chỉnh, mà chủ yếu vào việc chuẩn hóa yêu cầu và thiết kế hệ thống để đi vào phát triển hiệu quả hơn.

4. Product Backlog đưa vào Sprint

Các user story được đưa vào sprint:

- PB-04: US-VW-02 – Tra cứu & lọc quảng cáo
- PB-05: US-VW-03 – Xem quảng cáo & nhận xu
- PB-06: US-VW-05 – Ví xu & lịch sử giao dịch
- PB-07: US-AV-02 – Chọn đối tượng mục tiêu

Bảng ưu tiên:
- Tất cả các user story này đều được đánh giá là Must
- Mức độ ưu tiên cao vì trực tiếp liên quan đến chức năng cốt lõi của sản phẩm

5. Phân rã công việc (Sprint Backlog)

Sprint backlog bao gồm các task sau:

- T2-01: Vẽ Sequence Diagram UC-01 – Xem quảng cáo & nhận xu
  - Đầu ra: SEQ-01 (hình 1)
  - Ước lượng: 6 giờ
  - Phụ trách: Thành viên 1

- T2-02: Vẽ Sequence Diagram UC-02 – Đổi quà và UC-04/05 – Tạo & duyệt quảng cáo
  - Đầu ra: SEQ-01 (hình 2, 3)
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 2

- T2-03: Thiết kế Class Diagram (11 lớp)
  - Đầu ra: CLS-01
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 3

- T2-04: Đặc tả REST API cho 4 phần hệ
  - Đầu ra: API-01
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 4

- T2-05: Thiết kế wireframe 5 màn hình chính
  - Đầu ra: UI-01
  - Ước lượng: 10 giờ
  - Phụ trách: Thành viên 5

- T2-06: Rà soát chéo: đối chiếu thiết kế với SYS-02 và DB-03
  - Đầu ra: Bản rà soát
  - Ước lượng: 4 giờ
  - Phụ trách: Cả nhóm

6. Phân tích từng công việc bằng ngôn ngữ dễ hiểu

6.1. Sequence Diagram cho xem quảng cáo và nhận xu
Đây là luồng người dùng khi truy cập vào quảng cáo. Hệ thống sẽ:
- Xác định người dùng đang đăng nhập
- Lấy thông tin quảng cáo phù hợp
- Ghi nhận lượt xem
- Kiểm tra điều kiện đủ thời gian/quy tắc nhận xu
- Cộng xu vào ví nếu hợp lệ

Ví dụ thực tế:
Một người dùng mở quảng cáo 30 giây, hệ thống ghi nhận thời gian xem, kiểm tra quy tắc nhận xu và cập nhật số xu trong ví. Nếu người dùng chưa đủ điều kiện thì không cộng xu.

6.2. Sequence Diagram cho đổi quà và duyệt quảng cáo
Đây là quy trình nghiệp vụ phía sau khi người dùng muốn đổi quà hoặc quản trị viên duyệt quảng cáo:
- Người dùng chọn quà
- Hệ thống kiểm tra số xu hiện có
- Giữ tạm xu trong ví và kho quà
- Quản trị viên xác thực mã quà hoặc thông tin thực tế
- Hoàn tất hoặc từ chối yêu cầu

Ví dụ thực tế:
Nếu bạn có 500 xu và muốn đổi một món quà 300 xu, hệ thống sẽ:
- Kiểm tra số dư
- Khóa 300 xu
- Cập nhật trạng thái yêu cầu
- Chờ admin xác nhận
- Sau đó trừ xu và giao quà

6.3. Class Diagram
Class Diagram giúp mô hình hóa các đối tượng chính trong hệ thống, bao gồm:
- User
- Wallet
- Ad
- View
- Reward
- Redemption
- Admin
- Campaign / targeting

Mục tiêu của class diagram là cho phép nhóm lập trình cùng hiểu:
- Đối tượng nào có dữ liệu gì
- Mối quan hệ giữa các đối tượng
- Cách lưu trữ và xử lý nghiệp vụ

6.4. REST API
API được đặc tả cho bốn phần hệ chính:
- Quảng cáo
- Ví xu
- Đổi quà
- Thông tin người dùng / quyền truy cập

Mục tiêu của API:
- Tách logic backend khỏi giao diện
- Dễ test
- Dễ tích hợp giữa client và server
- Dễ mở rộng ở các sprint sau

6.5. Wireframe
Wireframe là bản phác thảo giao diện 5 màn hình chính:
- Màn hình quảng cáo
- Màn hình ví xu
- Màn hình đổi quà
- Màn hình quản lý quảng cáo
- Màn hình duyệt yêu cầu

Điểm đặc biệt là các màn hình này được thiết kế để phù hợp với luồng người dùng thực tế và dễ triển khai trong giai đoạn tiếp theo.

7. Phân tích thiết kế hệ thống

7.1. Mô hình nghiệp vụ
Hệ thống cần hỗ trợ 3 nhóm đối tượng chính:
- Người dùng: xem quảng cáo, nhận xu, đổi quà
- Quản trị viên: quản lý quảng cáo, duyệt yêu cầu
- Hệ thống: xác thực, kiểm tra số xu, xử lý giao dịch

7.2. Luồng nghiệp vụ quan trọng
Luồng 1: Người dùng xem quảng cáo
- Đăng nhập
- Chọn quảng cáo
- Xem quảng cáo
- Hệ thống ghi nhận thời gian xem
- Cộng xu nếu đủ điều kiện

Luồng 2: Người dùng đổi quà
- Kiểm tra số dư
- Chọn quà
- Gửi yêu cầu đổi quà
- Hệ thống khóa xu
- Chờ admin phê duyệt

Luồng 3: Admin duyệt
- Xem danh sách yêu cầu
- Xác nhận thông tin quà
- Duyệt hoặc từ chối
- Cập nhật trạng thái đơn

8. Định nghĩa hoàn thành (Definition of Done)

Các tiêu chí được xác định trong sprint:
- Mọi sơ đồ khớp với use case SYS-02 và các bảng DB-03
- Mỗi API ghi rõ đầu vào, đầu ra, mã lỗi và quyền truy cập
- Wireframe thể hiện đủ thông tin cần thiết trong luồng người dùng
- Được giảng viên hoặc nhóm review xét chốt phiên bản
- Mọi yêu cầu đã được chốt trước khi sprint kết thúc

Tóm lại:
Sprint 2 chỉ được coi là hoàn thành khi thiết kế đã chắc chắn, rõ ràng, thể hiện đúng nghiệp vụ, và không còn mâu thuẫn giữa frontend, backend và database.

9. Rủi ro của Sprint

Các rủi ro chính được xác định là:
- Lỗi gian lận khi hệ thống xác định xem quảng cáo và nhận xu
- Token hoặc heartbeat không phù hợp, dẫn đến việc sai lệch thời lượng xem
- Phụ thuộc giữa các task trong sprint: nếu thiết kế API hoặc database không đồng bộ, toàn bộ sprint thực hiện sau sẽ bị chậm
- Khó khăn trong việc thống nhất quy tắc xử lý số xu giữa các chức năng

10. Rà soát và bổ sung hoàn thiện

Theo slide, sau khi hoàn thành các task, nhóm cần thực hiện:
- Theo dõi tiến độ từng hạng mục
- Mỗi hạng mục có người phụ trách, ước lượng, trạng thái (To do/In progress/Review/Done)
- Phù hợp với bảng công việc và daily checklist
- Review và retrospective để phát hiện điểm thiếu sót trước khi sprint tiếp theo bắt đầu

11. Tiêu chí rà soát trước khi chốt Sprint

Trước khi kết thúc sprint, nhóm cần kiểm tra:
- Thiết kế có khớp với SRS không
- Thiết kế có khớp với database không
- Có thể triển khai dễ dàng không
- Các luồng người dùng có rõ và không mâu thuẫn không
- API đủ để hỗ trợ frontend không
- Đã có kiểm tra chéo giữa các thành viên chưa

12. Kết luận

Sprint 2 đóng vai trò quan trọng như một “nền tảng thiết kế” cho toàn bộ dự án. Nếu thiết kế đúng, các sprint sau sẽ triển khai nhanh và ít sai lệch. Sprint này không tập trung vào viết code đầy đủ, mà tập trung vào:
- Mô hình hóa nghiệp vụ
- Thiết kế luồng dữ liệu
- Thiết kế giao diện
- Định nghĩa API
- Chuẩn hóa tiêu chí hoàn thành

Nói cách khác, Sprint 2 là bước nền tảng để đảm bảo việc lập trình ở các sprint sau không bị lệch hướng.

Nếu bạn muốn, tôi có thể làm tiếp một trong ba phiên bản sau:
- Bản báo cáo theo kiểu “PowerPoint / slide” ngắn gọn
- Bản báo cáo theo kiểu “tự trình bày trước giảng viên” 15 phút
- Bản báo cáo dạng “đã chốt cho nộp” với phần mục lục và đánh giá chuyên nghiệp hơn.

## @sonthanhnguyendz777-dotcom

following up on the report above

## Copilot

Dưới đây là phần báo cáo tiếp theo dựa trên hình ảnh API-01 và các slide thiết kế bổ sung. Tôi chỉ dùng thông tin có trong tài liệu được hiển thị trong ảnh, không tự bịa thêm nội dung ngoài phạm vi đó.

BÁO CÁO PHẦN ĐẶC TẢ REST API – SPRINT 2

1. Mục tiêu API

API được thiết kế để hỗ trợ luồng nghiệp vụ chính của hệ thống YouTube Xu:
- Đăng ký, đăng nhập và xác thực người dùng
- Xem quảng cáo và nhận xu
- Kiểm tra ví xu
- Đổi quà cho người xem
- Quản lý quảng cáo của nhà quảng cáo
- Duyệt và quản trị các giao dịch, cảnh báo gian lận

Mục tiêu quan trọng là:
- Tách biệt frontend và backend
- Đảm bảo bảo mật và quyền truy cập
- Dễ kiểm thử và mở rộng cho sprint sau
- Dễ tích hợp với cơ sở dữ liệu và nghiệp vụ thực tế

2. Cấu trúc chung của API

- Base URL: /api/v1
- Xác thực: JWT trong header Authorization
- Mã lỗi chính:
  - 400: lỗi dữ liệu đầu vào
  - 401: chưa đăng nhập / token không hợp lệ
  - 403: không có quyền
  - 404: không tìm thấy
  - 409: xung đột nghiệp vụ
  - 429: vượt quá giới hạn
- Tất cả API đều có chuẩn phản hồi lỗi thống nhất: error/message/request_id

3. Phần 1. Tài khoản

3.1. Đăng ký
- Method: POST
- Endpoint: /auth/register
- Quyền: Guest
- Mô tả: Đăng ký tài khoản OTP
- Mã lỗi nghiệp vụ:
  - 409 email/SĐT trùng
  - 400 dữ liệu 16 tuổi
- Tài khoản mới phải tuân thủ quy định:
  - Email/SĐT chưa tồn tại
  - Tuổi hợp lệ theo quy định của hệ thống

3.2. Xác thực OTP
- Method: POST
- Endpoint: /auth/verify-otp
- Quyền: Guest
- Mô tả: Xác thực OTP, tạo tài khoản
- Mã lỗi:
  - 400 OTP sai/hết hạn

3.3. Đăng nhập
- Method: POST
- Endpoint: /auth/login
- Quyền: Guest
- Mô tả: Đăng nhập, trả JWT
- Mã lỗi:
  - 401 sai thông tin đăng nhập
  - 403 tài khoản bị khóa

3.4. Thông tin cá nhân
- Method: GET/PUT
- Endpoint: /me
- Quyền: Mọi vai trò
- Mô tả: Xem/cập nhật hồ sơ người dùng
- Mã lỗi:
  - 403 nếu người dùng không có quyền

4. Phần 2. Người xem – quảng cáo & ví

4.1. Danh sách quảng cáo
- Method: GET
- Endpoint: /ads?category=&sort=
- Quyền: Viewer
- Mô tả: Danh sách quảng cáo được phép xem hôm nay
- Mã lỗi nghiệp vụ: -
- Mục tiêu: lọc quảng cáo theo danh mục, sắp xếp, kiểm tra thời điểm hợp lệ

4.2. Bắt đầu xem quảng cáo
- Method: POST
- Endpoint: /views/start
- Quyền: Viewer
- Mô tả: Bắt đầu xem quảng cáo, trả view token
- Mã lỗi:
  - 429 hết hạn mức; 409 đã xem hôm nay; 409 hết ngân sách
- Dữ liệu đầu vào:
  - ad_id
  - duration
  - view token
- Hệ thống cần tạo view_token để đối chiếu ở các bước tiếp theo

4.3. Heartbeat
- Method: POST
- Endpoint: /views/heartbeat
- Quyền: Viewer
- Mô tả: Báo động xem (mỗi 5 giây)
- Mã lỗi:
  - 409 token không hợp lệ
- Ý nghĩa:
  - Giúp hệ thống theo dõi người xem còn đang ở trạng thái xem hay không
  - Tránh gian lận bằng cách đóng tab hoặc rời khỏi màn hình

4.4. Hoàn tất, cộng xu
- Method: POST
- Endpoint: /views/complete
- Quyền: Viewer
- Mô tả: Hoàn tất, cộng xu
- Mã lỗi:
  - 409 chưa xem đủ thời lượng
- Tính chất:
  - Chỉ cộng xu khi đáp ứng điều kiện xem hợp lệ
  - Một view_token chỉ được xử lý một lần

4.5. Xem ví
- Method: GET
- Endpoint: /wallet
- Quyền: Viewer
- Mô tả: Số dư và hạn mức ngày
- Mã lỗi: -
- Đây là API dùng để hiển thị số xu hiện tại và trạng thái giới hạn

4.6. Lịch sử giao dịch
- Method: GET
- Endpoint: /wallet/transactions?type=&page=
- Quyền: Viewer
- Mô tả: Lịch sử giao dịch ví
- Mã lỗi: -
- Hữu ích cho:
  - tra cứu lịch sử cộng/trừ xu
  - kiểm tra giao dịch gần đây
  - hỗ trợ khi có tranh chấp

5. Phần 3. Người xem – đổi quà

5.1. Danh mục quà
- Method: GET
- Endpoint: /rewards
- Quyền: Mọi vai trò
- Mô tả: Danh mục quà, tồn kho
- Mã lỗi: -
- Đây là API dùng để hiển thị danh sách quà đang được bán hoặc đổi

5.2. Tạo yêu cầu đổi quà
- Method: POST
- Endpoint: /redemptions
- Quyền: Viewer
- Mô tả: Yêu cầu đổi quà, gửi OTP
- Mã lỗi:
  - 409 thiếu xu
  - 429 hết hạn; 429 quá 3 đồng/ngày
- Tạo yêu cầu đổi quà cần đảm bảo:
  - Số dư đủ
  - Không vượt giới hạn số lần đổi/ngày
  - Người dùng đã xác thực OTP nếu có yêu cầu bảo mật

5.3. Xác nhận OTP
- Method: POST
- Endpoint: /redemptions/confirm
- Quyền: Viewer
- Mô tả: Xác nhận OTP, trừ xu
- Mã lỗi:
  - 400 OTP sai
  - 429 khóa 15 phút
- Đây là bước quan trọng để tránh đổi quà nhầm hoặc gian lận

5.4. Danh sách đơn đổi quà
- Method: GET
- Endpoint: /redemptions
- Quyền: Viewer
- Mô tả: Danh sách đơn và trạng thái
- Mã lỗi: -

6. Phần 4. Nhà quảng cáo

6.1. Tạo quảng cáo
- Method: POST
- Endpoint: /ads
- Quyền: Advertiser
- Mô tả: Tạo chiến dịch (PENDING) kèm targeting
- Mã lỗi:
  - 400 thời gian không hợp lệ
  - 409 giới hạn ngân sách
- Đây là điểm bắt đầu của một quảng cáo mới, cần kiểm tra:
  - Đối tượng mục tiêu
  - Ngân sách
  - Thời gian chạy
  - Bản quyền nội dung

6.2. Cập nhật trạng thái
- Method: PATCH
- Endpoint: /ads/{id}/status
- Quyền: Advertiser
- Mô tả: Tạm dừng / tiếp tục
- Mã lỗi:
  - 409 trạng thái không hợp lệ
- Người quảng cáo có thể dừng hoặc tiếp tục chiến dịch tùy điều kiện.

6.3. Báo cáo hiệu quả
- Method: GET
- Endpoint: /ads/{id}/report
- Quyền: Advertiser
- Mô tả: Báo cáo hiệu quả chiến dịch
- Mã lỗi:
  - 403 không phải chủ chiến dịch
- Dùng để xem:
  - số lượng click
  - hiệu quả
  - chi phí
  - tỷ lệ hoàn thành

7. Phần 5. Quản trị viên

7.1. Duyệt quảng cáo
- Method: GET
- Endpoint: /admin/ads?status=PENDING
- Quyền: Admin
- Mô tả: Danh sách quảng cáo chờ duyệt
- Mã lỗi: -
- Đây là nơi admin kiểm tra các chiến dịch vừa được tạo

7.2. Duyệt/từ chối
- Method: PATCH
- Endpoint: /admin/ads/{id}
- Quyền: Admin
- Mô tả: Duyệt/từ chối chiến dịch
- Mã lỗi:
  - 409 dữ liệu không hợp lệ
- Admin có quyền approve hoặc reject chiến dịch

7.3. Duyệt đơn đổi quà
- Method: GET/PATCH
- Endpoint: /admin/redemptions
- Quyền: Admin
- Mô tả: Xem và xử lý yêu cầu đổi quà
- Mã lỗi:
  - 409 dữ liệu không hợp lệ
- Đây là luồng quan trọng vì liên quan đến số xu và kho quà

7.4. Quản lý gian lận
- Method: GET
- Endpoint: /admin/fraud
- Quyền: Admin
- Mô tả: Danh sách các báo cáo gian lận
- Mã lỗi: -

7.5. Chặn hành động người dùng
- Method: POST
- Endpoint: /admin/fraud/{user_id}/action
- Quyền: Admin
- Mô tả: Ignore / invalidate / lock
- Mã lỗi:
  - 404 không tìm thấy
- Hệ thống có khả năng chặn hoặc khóa tài khoản nếu phát hiện hành vi gian lận

7.6. Cấu hình quyền xu
- Method: PUT
- Endpoint: /admin/xu-rules
- Quyền: Admin
- Mô tả: Cấu hình quy tắc xu
- Mã lỗi:
  - 400 giá trị không hợp lệ
- Dùng để thay đổi các quy tắc cộng/trừ xu theo chiến lược kinh doanh

7.7. Xuất báo cáo
- Method: GET
- Endpoint: /admin/reports/export
- Quyền: Admin
- Mô tả: Xuất Excel xu phát hành/đổi quà
- Mã lỗi: -

8. Ví dụ phản hồi của API

8.1. Ví dụ 1: Bắt đầu xem quảng cáo
Request:
- POST /api/v1/views/start
- Body: { "ad_id": 101 }
- Response 200:
  {
    "view_token": "tok_7fa3...",
    "video_url": "https://youtube.com/watch?v=...",
    "duration_sec": 30,
    "reward_xu": 10,
    "heartbeat_interval_sec": 5
  }

Response 429:
{
  "error": "DAILY_LIMIT",
  "message": "Bạn đã đạt giới hạn 50 lượt/500 xu hôm nay"
}

8.2. Ví dụ 2: Hoàn tất xem quảng cáo
Request:
- POST /api/v1/views/complete
- Body: { "view_token": "tok_7fa3..." }

Response 200:
{
  "earned_xu": 10,
  "balance": 1260
}

Response 409:
{
  "error": "NOT_WATCHED_ENOUGH",
  "message": "Bạn cần xem hết quảng cáo để nhận xu"
}

9. Rà soát và bổ sung hoàn thiện

Qua phần API, nhóm cần chú ý các điểm sau:
- Xác thực và phân quyền:
  - Mọi API yêu cầu JWT hợp lệ
  - Kiểm tra role và quyền sở hữu tài nguyên
  - Token hết hạn trả 401; thiếu quyền trả 403
  - Không chấp nhận user_id do client tự gửi

- Tính idempotent:
  - /views/complete và các API đổi quà phải chống gửi lặp
  - Mỗi view_token chỉ được hoàn tất một lần
  - Yêu cầu lặp lại không được cộng xu hoặc trừ xu lần nữa

- Kiểm tra dữ liệu đầu vào:
  - Kiểm tra dữ liệu đầu vào: URL video, thời lượng 5-60 giây, ngân sách, target group
  - Tất cả phải được validate trước khi chốt sprint

- Giao dịch ví xu:
  - Các thao tác tạm dừng, cộng/trừ xu và tồn kho phải đúng transaction
  - 409 dùng cho xung đột nghiệp vụ
  - 429 dùng cho giới hạn tần suất hoặc hạn mức

- Ví dụ phản hồi chuẩn:
  - success/data/request_id
  - error/message/request_id
  - Trạng thái lỗi cần rõ ràng, có mã request_id để trace

10. Kết luận

Phần API-01 cho thấy hệ thống YouTube Xu được xây dựng theo mô hình backend rõ ràng, phân tách theo nghiệp vụ:
- Tài khoản
- Người xem
- Đổi quà
- Nhà quảng cáo
- Quản trị viên

Điểm mạnh của API design này là:
- Có cấu trúc rõ ràng
- Có phân quyền rõ ràng
- Có xác thực JWT
- Có quy định lỗi và giới hạn tần suất
- Có thể mở rộng cho các chức năng sau

Điểm cần chú ý:
- Bảo mật và idempotency là bắt buộc
- Cần kiểm soát đầy đủ lỗi trong quá trình xem quảng cáo và đổi quà
- Các API liên quan đến ví xu, kho quà và admin duyệt là các phần cực kỳ nhạy cảm, nên phải kiểm tra kỹ trước khi triển khai hoàn chỉnh

Nếu bạn muốn, tôi có thể làm tiếp một trong 3 bản sau:
- Bản báo cáo dạng slide 10 slide để trình bày trước lớp
- Bản “script nói 15 phút” theo kiểu thuyết trình
- Bản “biên bản review & retrospective” cho Sprint 2 theo chuẩn Scrum.

## @sonthanhnguyendz777-dotcom

following on from the reports above

## Copilot

Dưới đây là phần tiếp theo của báo cáo, dựa trên nội dung ảnh Class Diagram và các ghi chú bổ sung.

PHẦN CLASS DIAGRAM – SPRINT 2

1. Tổng quan sơ đồ lớp

Sơ đồ lớp (Class Diagram) mô hình hóa các thực thể chính của hệ thống YouTube Xu – Xem quảng cáo nhận xu, gồm:
- User / Viewer / Advertiser / Admin
- Ad
- AdTargeting
- AdCategory
- AdView
- Reward / Redemption
- XuTransaction
- Enum trạng thái và loại giao dịch

Mục tiêu của sơ đồ lớp là:
- Mô tả mối quan hệ giữa các thành phần nghiệp vụ
- Chia rõ trách nhiệm xử lý giữa các lớp
- Dễ dàng mapping sang cơ sở dữ liệu và API
- Hỗ trợ triển khai code ở các sprint tiếp theo

2. Giải thích các lớp chính

2.1. User / Viewer / Advertiser / Admin
Đây là lớp cha chứa thông tin tài khoản người dùng.
Các thuộc tính chính của User:
- userId
- email
- phone
- fullName
- passwordHash
- role
- status
- xuBalance
- createdAt
- updatedAt

Vai trò:
- Viewer: người xem quảng cáo, nhận xu, đổi quà
- Advertiser: nhà quảng cáo tạo và quản lý chiến dịch
- Admin: quản trị hệ thống, duyệt quảng cáo và xử lý sự cố
- User là lớp tổng quát, các vai trò kế thừa từ nó

Mối quan hệ:
- User có thể tạo nhiều yêu cầu đổi quà
- User có thể nhận xu thông qua AdView
- User có thể tạo chiến dịch nếu là Advertiser
- Admin có thể xem và duyệt quảng cáo, xử lý gian lận

2.2. Ad
Lớp Ad đại diện cho quảng cáo.
Các thuộc tính chính:
- adId
- title
- description
- videoUrl
- durationSec
- rewardXu
- spendXu
- startDate
- endDate
- status
- isAvailableForViewer
- reserveBudget
- releaseBudget

Vai trò:
- Quảng cáo có thể được tạo bởi Advertiser
- Quảng cáo có thể có đối tượng mục tiêu
- Quảng cáo có trạng thái: DRAFT, PENDING, ACTIVE, PAUSED, ENDED, REJECTED
- Hệ thống kiểm tra trạng thái trước khi hiển thị cho viewer

2.3. AdTargeting
Lớp này dùng để xác định điều kiện target audience cho quảng cáo.
Các thuộc tính:
- gender
- ageFrom
- ageTo
- province
- matches(viewer)

Vai trò:
- Lọc các viewer phù hợp với quảng cáo
- Chỉ những người thỏa điều kiện mới được xem và nhận xu

2.4. AdCategory
Lớp này đại diện cho danh mục quảng cáo.
Ví dụ:
- thể thao
- thời trang
- giáo dục
- công nghệ
- giải trí

Vai trò:
- Nhóm các quảng cáo theo cùng chủ đề
- Hỗ trợ lọc và tìm kiếm quảng cáo

2.5. AdView
Lớp AdView mô hình hóa một lượt xem quảng cáo.
Các thuộc tính chính:
- viewId
- userId
- adId
- viewToken
- startedAt
- completedAt
- watchedSeconds
- status
- heartbeat
- isValid
- invalidReason

Vai trò:
- Theo dõi xem quảng cáo của viewer
- Kiểm tra xem đã xem đủ thời lượng hay chưa
- Ghi nhận các lượt xem invalid nếu vi phạm điều kiện
- Đây là lớp quan trọng để cộng xu hoặc từ chối yêu cầu

2.6. Reward / Redemption
Lớp Reward:
- Đại diện cho quà đang có trong hệ thống
- Bao gồm thông tin quà, tồn kho, điểm quy đổi

Lớp Redemption:
- Đại diện cho yêu cầu đổi quà
- Có trạng thái: PENDING, APPROVED, DELIVERED, REJECTED
- Ghi nhận thông tin:
  - redemptionId
  - userId
  - xuSpent
  - giftId
  - status
  - requestedAt
  - approvedAt
  - processedAt

Vai trò:
- Viewer gửi yêu cầu đổi quà
- Admin duyệt hoặc từ chối
- Hệ thống trừ xu và cập nhật trạng thái

2.7. XuTransaction
Lớp này lưu trữ các giao dịch cộng/trừ xu.
Các thuộc tính:
- txnId
- type
- amount
- balanceAfter
- note
- createdAt
- relatedEntity

Các loại giao dịch:
- EARN
- REDEEM
- REFUND
- BONUS
- ADJUST

Vai trò:
- Theo dõi số xu của từng user
- Dễ kiểm tra lịch sử giao dịch
- Bảo đảm cộng/trừ xu xảy ra đúng nghiệp vụ
- Hỗ trợ truy vết khi có tranh chấp

3. Các Enum

Theo sơ đồ, hệ thống có các enum chính như sau:

- Role:
  - VIEWER
  - ADVERTISER
  - ADMIN

- AccountStatus:
  - ACTIVE
  - LOCKED

- AdStatus:
  - DRAFT
  - PENDING
  - ACTIVE
  - PAUSED
  - ENDED
  - REJECTED

- ViewStatus:
  - STARTED
  - COMPLETED
  - INVALID

- RedemptionStatus:
  - PENDING
  - APPROVED
  - DELIVERED
  - REJECTED

- TxnType:
  - EARN
  - REDEEM
  - REFUND
  - BONUS
  - ADJUST

Các enum này rất quan trọng vì:
- Kiểm soát trạng thái nghiệp vụ
- Chỉ cho phép chuyển trạng thái theo đúng luồng hợp lệ
- Giảm rủi ro sai trạng thái trong hệ thống

4. Rà soát và bổ sung hoàn thiện

4.1. Chia trách nhiệm lớp
Theo sơ đồ, các lớp cần có trách nhiệm rõ ràng:
- UserService: xử lý tài khoản và phân quyền
- AdService: quản lý chiến dịch quảng cáo
- ViewService: xác minh token/thời lượng
- WalletService: quản lý số dư
- RedemptionService: xử lý đổi quà
- FraudService: phát hiện và báo cáo gian lận
- AdminService: giám sát và quản trị hệ thống

Những lớp này cần tách biệt rõ ràng để:
- giảm phụ thuộc
- dễ kiểm thử
- dễ mở rộng khi có nghiệp vụ mới

4.2. Nguyên tắc thiết kế
- Giao diện không tự tính số xu
- Mỗi nghiệp vụ và cấp dữ liệu phải nằm ở lớp dịch vụ phù hợp
- Repository chịu trách nhiệm truy cập dữ liệu

4.3. Ràng buộc quan hệ
- Một lượt xem hoàn tất có thể có một giao dịch EARN
- Một đơn đổi quà có thể dẫn đến giao dịch REDEEM
- Một giao dịch có thể liên quan đến tài khoản, quảng cáo hoặc đơn đổi quà
- Các quan hệ này cần được thể hiện nhất quán trong sơ đồ và trong DB

4.4. Kiểm soát trạng thái
- Chỉ cho phép chuyển trạng thái theo luồng hợp lệ
- Ví dụ:
  - PENDING → ACTIVE/REJECTED
  - STARTED → COMPLETED/INVALID
- Luồng này cần được kiểm tra ngay ở lớp nghiệp vụ và repository

5. Kết luận

Class Diagram của Sprint 2 đã định hình một mô hình hệ thống rõ ràng, gồm:
- người dùng, quảng cáo, lượt xem, ví xu, đơn đổi quà
- server-side service layer
- enum trạng thái
- quan hệ dữ liệu và business rules

Điểm mạnh của sơ đồ này là:
- Giúp phát triển code theo hướng rõ ràng
- Tách biệt trách nhiệm từng lớp
- Dễ dàng mapping với API và DB
- Hỗ trợ kiểm thử và review kỹ thuật

Điểm cần lưu ý:
- Luồng trạng thái phải được kiểm soát nghiêm ngặt
- Việc cộng/trừ xu và đơn đổi quà phải được tích hợp với transaction
- Các rule về target, view validity và wallet balance phải được thực hiện ở lớp service, không đặt ở frontend

Nếu bạn muốn, tôi có thể làm tiếp một trong ba dạng:
- Bản tóm tắt ngắn 1 trang để trình bày trước lớp
- Bản “script thuyết trình 5 phút” theo từng phần của Class Diagram
- Bản chuẩn bị cho slide PowerPoint theo kiểu chuyên nghiệp, có tiêu đề, bullet, và câu hỏi giảng viên.

## @sonthanhnguyendz777-dotcom

following on from the reports above

## Copilot

Dưới đây là phần báo cáo tiếp theo cho Sprint 2, tập trung vào Sequence Diagram (SEQ-01) và các tiêu chí rà soát, dựa hoàn toàn trên thông tin hiển thị trong hình.

PHẦN SEQUENCE DIAGRAM – SPRINT 2

1. Mục đích của Sequence Diagram

Sequence Diagram dùng để mô tả luồng tương tác giữa các thành phần trong hệ thống theo thời gian:
- Người dùng
- Giao diện web
- Máy chủ backend
- Cơ sở dữ liệu

Mục tiêu của SEQ-01 là mô tả rõ các use case chính trong hệ thống:
- UC-01: Xem quảng cáo và nhận xu
- UC-02: Đổi xu lấy quà
- UC-04 & UC-05: Tạo chiến dịch quảng cáo và duyệt quảng cáo

Qua sơ đồ, ta thấy các luồng nghiệp vụ được thực hiện theo thứ tự rõ ràng, đồng thời nhấn mạnh:
- kiểm tra điều kiện
- ghi nhận trạng thái
- xử lý nghiệp vụ
- giao dịch tài chính
- lưu dữ liệu xuống hệ thống

2. Use case UC-01: Xem quảng cáo và nhận xu

2.1. Luồng chính
- Người dùng mở trang web và chọn quảng cáo
- Frontend gửi request POST /views/start { ad_id }
- Backend kiểm tra điều kiện xem:
  - quảng cáo có hợp lệ không
  - user có bị giới hạn không
  - đã xem quá số lần trong ngày chưa
- Nếu hợp lệ:
  - hệ thống tạo view_token
  - lưu dữ liệu vào DB
  - trả về thông tin view_token, video_url, duration, reward_xu, heartbeat_interval
- Trong quá trình xem quảng cáo:
  - frontend gửi POST /views/heartbeat(token)
  - backend cập nhật watched_seconds
- Khi người dùng xem xong:
  - frontend gửi POST /views/complete(token)
  - backend kiểm tra thời gian xem đã đủ chưa
  - nếu đủ:
    - BEGIN, COMPLETE
    - users.xu_balance += reward_xu
    - INSERT xu_transactions(EARN)
    - commit
  - nếu chưa đủ:
    - trả lỗi NOT_WATCHED_ENOUGH

2.2. Quy tắc nghiệp vụ trong UC-01
Theo sơ đồ, các điều kiện quan trọng là:
- Người dùng chỉ nhận xu nếu xem đủ thời lượng quảng cáo
- Mỗi view_token chỉ được xử lý một lần
- Đảm bảo số xu trong ví và lịch sử giao dịch luôn đồng bộ
- Không cộng xu nếu không đạt điều kiện
- Nếu vượt giới hạn số lượt xem/ngày hoặc vượt ngân sách, hệ thống trả lỗi 429 hoặc 409 tùy trường hợp

2.3. Ví dụ thực tế
- Một người dùng xem quảng cáo 30 giây, hệ thống tính được reward_xu là 10.
- Nếu xem 20 giây nhưng điều kiện yêu cầu là 30 giây, hệ thống từ chối cộng xu.
- Nếu người dùng xem quá 50 lượt/500 xu trong ngày, hệ thống trả lỗi DAILY_LIMIT.

3. Use case UC-02: Đổi xu lấy quà

3.1. Luồng chính
- Người dùng chọn quà trong danh sách
- Frontend gửi POST /redemptions {reward_id}
- Backend kiểm tra:
  - số xu trong ví
  - giới hạn số đơn/ngày
  - trạng thái tài khoản
- Nếu hợp lệ:
  - hệ thống yêu cầu OTP
  - frontend gửi POST /redemptions/confirm(otp)
- Backend tiến hành:
  - INSERT redemption
  - INSERT xu_transactions(REDEEM)
  - COMMIT
- Nếu số xu > 50.000đ:
  - đơn cần được duyệt bởi Admin
  - trạng thái đơn sẽ là PENDING
- Nếu số xu ≤ 50.000đ:
  - đơn được duyệt tự động
  - trạng thái đơn là APPROVED
- Sau khi admin duyệt hoặc hoàn tất:
  - hệ thống hoàn xu (REFUND) nếu bị từ chối
  - hoặc cập nhật trạng thái DELIVERED nếu giao thành công

3.2. Quy tắc nghiệp vụ trong UC-02
Theo sơ đồ, các quy tắc quan trọng là:
- Đơn quá 50.000đ phải chờ Admin duyệt, không tự động hoàn tất
- Đổi quà chỉ được thực hiện nếu người dùng có đủ xu
- OTP là bước xác thực bắt buộc
- Giao dịch xu phải là transaction, không được cộng/trừ lệch
- Nếu đơn bị từ chối, hệ thống hoàn xu bằng giao dịch REFUND
- Mỗi đơn đổi quà cần có trạng thái rõ ràng

3.3. Ví dụ thực tế
- Người dùng có 1.260 xu, đổi quà trị giá 300 xu.
- Hệ thống kiểm tra số dư, xác nhận OTP, trừ xu và lưu giao dịch.
- Nếu đơn đổi quà lớn hơn 50.000đ, hệ thống đánh dấu PENDING và gửi cho Admin xét duyệt.

4. Use case UC-04 & UC-05: Tạo chiến dịch quảng cáo và duyệt quảng cáo

4.1. Luồng tạo quảng cáo
- Nhà quảng cáo tạo chiến dịch
- Frontend gửi POST /ads {thông tin, ngân sách, đối tượng}
- Backend validate:
  - 5–60s, ngân sách > 0
  - đối tượng mục tiêu hợp lệ
- Nếu hợp lệ:
  - hệ thống INSERT ads(PENDING) + ad_targeting
  - trạng thái quảng cáo là PENDING

4.2. Luồng duyệt quảng cáo
- Admin gọi GET /admin/ads?status=PENDING
- Backend trả danh sách chiến dịch chờ duyệt
- Admin thực hiện PATCH /admin/ads/{id} {approve/reject, lý do}
- Nếu duyệt:
  - status = ACTIVE
  - reviewed_by = admin
- Nếu từ chối:
  - status = REJECTED
  - lưu lý do từ chối
- Hệ thống gửi thông báo kết quả về nhà quảng cáo

4.3. Quy tắc nghiệp vụ trong UC-04 & UC-05
- Quảng cáo chỉ được phép hiển thị khi có status = ACTIVE
- Nếu bị từ chối, không được chạy quảng cáo
- Chỉ Admin mới được duyệt hoặc từ chối
- Mỗi quảng cáo có target group và ngân sách riêng
- Kiểm tra dữ liệu đầu vào là bắt buộc trước khi chèn vào DB

5. Rà soát và bổ sung hoàn thiện

5.1. Nguyên tắc đặc tả rõ ràng
- Mỗi tên lần thể hiện luồng gọi: mỗi tên trả về biểu diễn kết quả; nhánh alt/opt thể hiện điều kiện hoặc luồng ngoại lệ.
- Tên thông điệp cần khớp với endpoint và tên thao tác trong SRS/API-01.
- Mỗi alt/opt phải có điều kiện rõ ràng, không mơ hồ.

5.2. Tính nguyên tử và chống lặp
- Sơ đồ có cộng xu cần thể hiện rõ bước kiểm tra trạng thái, bắt đầu transaction, ghi số cái, cập nhật số dư và commit.
- Khi có lỗi, phải rollback.
- Không xử lý cộng xu chỉ dựa trên thông báo từ frontend, phải có kiểm tra lại phía backend.
- Tương tự với đơn đổi quà, chỉ khi tất cả bước đều hợp lệ mới commit.

5.3. Nhật ký quản trị
- Với cảnh báo gian lận, ghi lại mã cảnh báo, bằng chứng, quyết định của Admin, lý do và thời điểm.
- Các dữ liệu này cần được lưu lại để audit, tra cứu và xử lý sau này.
- Không được để quyết định Admin chỉ nằm trong UI; phải có log phía server.

5.4. Kiểm soát trạng thái
- Chỉ cho phép chuyển trạng thái theo luồng hợp lệ:
  - PENDING → ACTIVE / REJECTED
  - STARTED → COMPLETED / INVALID
- Luôn có kiểm tra giá trị đầu vào và điều kiện nghiệp vụ trước khi thay đổi trạng thái.

6. Tóm tắt quan trọng

Sequence Diagram cho thấy hệ thống YouTube Xu được thiết kế theo hướng:
- Luồng nghiệp vụ rõ ràng
- Có kiểm soát điều kiện trước khi cập nhật dữ liệu
- Có transaction cho các thao tác critical
- Có phân quyền rõ ràng giữa Viewer, Advertiser, Admin
- Có audit trail cho các quyết định quan trọng

Tổng kết:
- UC-01 tập trung vào view + reward
- UC-02 tập trung vào redemption + security
- UC-04 & UC-05 tập trung vào advertiser và admin approval
- SEQ-01 là nền tảng để chuyển từ thiết kế sang lập trình backend và frontend

Nếu bạn muốn, tôi có thể làm tiếp:
- Bản tóm tắt ngắn 1 trang để nộp vào báo cáo
- Bản slide trình bày ngắn gọn cho Sequence Diagram
- Một phiên bản “thuyết trình 10 phút” theo đúng cấu trúc Sprint 2.

## @sonthanhnguyendz777-dotcom

following on from the reports above

## Copilot

Dưới đây là phần tiếp theo của báo cáo Sprint 2, tập trung vào giao diện (UI Wireframe) của hệ thống YouTube Xu – Xem quảng cáo nhận xu.

PHẦN UI WIREFRAME – SPRINT 2

1. Mục tiêu của giao diện

Wireframe được xây dựng để thể hiện luồng người dùng và tích hợp rõ ràng giữa:
- Người xem quảng cáo
- Nhận xu
- Theo dõi ví xu
- Đổi quà
- Quản lý quảng cáo của nhà quảng cáo
- Duyệt quảng cáo của Admin

Mục tiêu của UI không chỉ là đẹp mắt, mà còn phải đảm bảo:
- Dễ hiểu
- Dễ thao tác
- Có phản hồi trạng thái rõ ràng
- Giảm lỗi trong quá trình xem quảng cáo và đổi quà
- Hỗ trợ tốt cho luồng nghiệp vụ đã định nghĩa trong API và Sequence Diagram

2. Màn hình 1: Danh sách quảng cáo (UC-V01)

Màn hình này mô tả trải nghiệm đầu tiên của người dùng khi vào hệ thống.

Các thành phần chính:
- Header: “YouTube Xu” + số xu hiện có
- Khung tiến độ hôm nay: “Hôm nay: 12/50 lượt” và “120/500 xu”
- Bộ lọc theo loại:
  - Tất cả
  - Game
  - Giáo dục
  - Âm thực
- Danh sách quảng cáo dạng card
  - Ảnh/video giả định
  - Tên quảng cáo
  - Thời lượng
  - Nút “Xem +10 xu” / “Xem +5 xu”
- Footer tab điều hướng:
  - Xem QC
  - Ví xu
  - Đổi quà
  - Hồ sơ

Phân tích:
- Màn hình này đáp ứng nhu cầu chính: giúp người dùng dễ chọn quảng cáo phù hợp.
- Quy tắc mục tiêu rõ ràng:
  - số lượt xem và xu nhận được trong ngày có giới hạn
  - UX hiển thị mức tiến độ để kích thích người dùng tiếp tục
- Giao diện đơn giản, trực quan, dễ triển khai trên mobile.

Ví dụ thực tế:
Người dùng mở màn hình, thấy một quảng cáo “Học tiếng Anh cùng Elsa” và một quảng cáo “Combo trà sữa mùa thi”, sau đó chọn quảng cáo phù hợp với thời gian còn lại và nhấn “Xem +10 xu”.

3. Màn hình 2: Xem quảng cáo (UC-V02)

Màn hình này mô tả trạng thái phát video quảng cáo và quá trình nhận xu.

Các thành phần chính:
- Header có nút quay lại và số xu đang có
- Khu vực video:
  - nền đen
  - nội dung video giả định
- Thanh tiến độ xem:
  - 18s / 30s
  - có thông báo “Còn 12 giây để nhận +10 xu”
- Thông tin quảng cáo:
  - tên quảng cáo
  - nhà quảng cáo
- Cảnh báo:
  - “Không chứng thực tab hoặc thiết bị, hệ thống không được cộng xu”
- Nút:
  - “Nhận xu (khả dụng khi hết thời gian xem)”
- Các trạng thái xử lý:
  - chưa xem đủ
  - xem đủ thì cộng xu
  - nếu rời tab hoặc mở tab khác sẽ không được tính xu

Phân tích:
- Đây là màn hình quan trọng nhất, vì nó quyết định tính hợp lệ và tính chính xác của việc nhận xu.
- Màn hình phản ánh đúng nghiệp vụ:
  - hãy coi như video đang chạy
  - tracker thời lượng xem
  - khi đủ điều kiện thì cộng xu
  - khi không đủ điều kiện, hiển thị cảnh báo rõ ràng

Ví dụ thực tế:
Người dùng đang xem video quảng cáo và hệ thống đếm thời gian. Nếu người dùng dừng xem sớm, hệ thống sẽ cảnh báo: “Khổng chứng thực tab hoặc phát video không đủ thời lượng sẽ không được cộng xu”.

4. Màn hình 3: Ví xu & lịch sử giao dịch (UC-V03)

Màn hình này hiển thị số dư xu và lịch sử giao dịch.

Các thành phần chính:
- Header:
  - “Ví xu”
  - số dư hiện tại: 1.250 xu
- Khối số dư:
  - Số dư hiện tại
  - Quy đổi tương đương tiền
  - Nút “Đổi quà”
- Tabs:
  - Tất cả
  - Nhận xu
  - Đã đổi
- Danh sách giao dịch:
  - “Xem ‘Combo trà sữa mùa thi’ +5”
  - “Xem ‘Học tiếng Anh cùng Elsa’ +10”
  - “Đổi thẻ điện thoại 10.000đ -1.000”
- Mỗi dòng giao dịch có:
  - mô tả
  - ngày giờ
  - số xu cộng/trừ
  - màu sắc phân biệt rõ:

+ màu xanh cho cộng
- màu đỏ cho trừ

Phân tích:
- Màn hình này phù hợp với nhu cầu quản lý tài chính trong hệ thống.
- Tạo sự tin cậy cho người dùng vì họ biết rõ:
  - số dư hiện tại
  - khi nào được cộng
  - khi nào bị trừ
  - lý do giao dịch
- Đây là màn hình quan trọng để hỗ trợ sau này cho admin và hỗ trợ khách hàng.

Ví dụ thực tế:
Nếu người dùng nhận xu từ 2 quảng cáo, hệ thống cập nhật hàng loạt giao dịch:
- +5 từ “Combo trà sữa mùa thi”
- +10 từ “Học tiếng Anh cùng Elsa”
Sau đó nếu đổi quà 10.000đ, số dư giảm xuống còn 1.235 xu.

5. Giao diện nhà quảng cáo và quản trị viên (phần bổ sung)

Mặc dù các hình ảnh chính tập trung vào người xem, nhưng từ các tài liệu trước đó và wireframe cũng cho thấy có các màn hình liên quan đến:
- Tạo chiến dịch quảng cáo
- Duyệt quảng cáo
- Báo cáo hiệu quả
- Quản lý trạng thái quảng cáo

Các chức năng dự kiến:
- Nhà quảng cáo:
  - tạo quảng cáo
  - nhập ngân sách
  - cấu hình đối tượng mục tiêu
  - chờ Admin duyệt
- Admin:
  - xem danh sách quảng cáo chờ duyệt
  - approve/reject
  - xem báo cáo và xử lý gian lận

Điểm cần chú ý:
- UI phải rõ ràng để admin không lẫn lộn giữa trạng thái hợp lệ và bị từ chối
- Nên có cảnh báo màu sắc rõ ràng:
  - xanh = active
  - vàng = pending
  - đỏ = rejected

6. Nguyên tắc UX trong thiết kế

Từ các wireframe có thể rút ra một số nguyên tắc UX rõ ràng:

- Thiết kế hướng tới người dùng mới:
  - dễ hiểu ngay từ lần đầu
  - không đẩy quá nhiều thông tin cùng lúc

- Tối ưu cho mobile:
  - các card rộng vừa đủ
  - nút bấm lớn
  - phân tách rõ từng nhóm chức năng

- Phản hồi trạng thái rõ ràng:
  - hiện số xu đang có
  - hiện trạng thái hôm nay
  - hiển thị lỗi nếu chưa đủ thời lượng
  - cảnh báo khi không hợp lệ

- Tính minh bạch tài chính:
  - xu cộng/trừ đều được hiển thị
  - lịch sử giao dịch rõ ràng
  - không để người dùng cảm thấy mơ hồ về số dư

7. Đánh giá ưu điểm của UI

- Tính trực quan cao
- Dễ sử dụng cho người xem
- Khớp với logic nghiệp vụ
- Có tính thuyết phục về gamification: nhận xu ngay sau khi xem quảng cáo
- Mỗi màn hình có mục tiêu rõ ràng và không quá tải thông tin

8. Rủi ro và đề xuất cải tiến

8.1. Rủi ro trong UI
- Người dùng có thể nhầm lẫn giữa “đã xem đủ” và “đang xem”
- Nếu không có hợp lệ thật, người dùng có thể cảm thấy hệ thống “không công bằng”
- Nếu không hiển thị rõ thời gian, người dùng sẽ không biết khi nào được cộng xu
- Nếu giao diện quá nặng, trải nghiệm sẽ giảm xuống

8.2. Đề xuất cải tiến
- Thêm animation hoặc progress bar rõ ràng
- Hiển thị thời gian còn lại theo giây real-time
- Thêm thông báo chi tiết khi không đủ tiêu chí nhận xu
- Thêm “xem lại giao dịch” cho từng type transaction
- Thêm trạng thái “pending/approved/rejected” rõ ràng cho quà đổi

9. Kết luận

Wireframe của Sprint 2 đã thể hiện đúng hướng thiết kế chức năng cốt lõi của hệ thống YouTube Xu:
- Người xem có thể tìm quảng cáo, xem quảng cáo, nhận xu
- Ví xu có trạng thái rõ ràng và hỗ trợ lịch sử giao dịch
- Đổi quà có luồng rõ, dễ hiểu
- Tương lai cho nhà quảng cáo và admin cũng đã được hình dung rõ

Về mặt UX, các màn hình này khá hợp lý cho một sản phẩm demo và là nền tảng tốt để phát triển tiếp ở sprint sau:
- tối ưu trải nghiệm
- tăng độ tin cậy
- giảm nhầm lẫn trong tài chính và thời gian xem

Nếu bạn muốn, tôi có thể làm tiếp một trong ba dạng sau:
- Bản tóm tắt 1 trang cho UI
- Bản “script thuyết trình 10 phút” phần Wireframe
- Bản tiêu chí review UI theo kiểu giảng viên chấm: “đúng mục tiêu, rõ logic, dễ dùng, chưa hoàn thiện ở đâu”.

## @sonthanhnguyendz777-dotcom

following on from the reports above

## Copilot

Dưới đây là phần tiếp theo của báo cáo Sprint 2, tập trung vào giao diện quản trị quảng cáo và các tiêu chí hoàn thiện của UI.

5. Duyệt quảng cáo (Admin – UC-AD01)

Màn hình admin cho phép quản trị viên xem danh sách quảng cáo đang chờ duyệt, xem trước video và quyết định approve/reject.

1) Cấu trúc giao diện
- Sidebar trái:
  - Admin
  - Quảng cáo chờ duyệt
  - Đơn đổi thưởng
  - Cảnh báo gian lận
  - Quy tắc xu
  - Quà & kho
  - Báo cáo

- Nội dung chính:
  - Bảng danh sách quảng cáo chờ duyệt gồm 3 record mẫu:
    - #101: Học tiếng Anh cùng Elsa
    - #102: Combo trà sữa mùa thi
    - #103: Ốp lưng chống số X1
  - Các cột:
    - Mã
    - Tiêu đề
    - Nhà quảng cáo
    - Danh mục
    - Giấy
    - Ngân sách
    - Thao tác

- Mỗi dòng có 2 nút hành động:
  - Duyệt
  - Từ chối

2) Luồng thao tác
- Admin mở danh sách chờ duyệt
- Chọn một quảng cáo cụ thể
- Xem trước nội dung video trong khung preview
- Đọc lý do từ chối (nếu có), hoặc ghi chú cho việc duyệt
- Chọn:
  - Duyệt: trạng thái chuyển sang ACTIVE
  - Từ chối: trạng thái chuyển sang REJECTED

3) Ý nghĩa nghiệp vụ
Màn hình này là nơi thực hiện kiểm tra nghiệp vụ quan trọng:
- Quảng cáo có đủ dữ liệu chưa?
- Có phù hợp với target group không?
- Ngân sách và nội dung có hợp lệ không?
- Có vi phạm chính sách quảng cáo hay không?
- Có cần chỉnh sửa nội dung hoặc từ chối không?

Như vậy, UI này không chỉ là màn hình quản trị đơn thuần mà còn là cổng kiểm soát chất lượng dẫn đến sự an toàn cho hệ thống.

4) Gợi ý thiết kế tốt
- Bảng danh sách cần rõ ràng, dễ quét
- Preview video nên hiển thị lớn đủ để admin xem kỹ
- Nút Duyệt/Từ chối phải có màu sắc khác biệt rõ:
  - xanh cho duyệt
  - đỏ cho từ chối
- Lý do từ chối nên nằm dưới preview hoặc trong một ô text riêng để dễ ghi chú

6. Rà soát và bổ sung hoàn thiện

Sau khi giao diện admin hoàn thiện, nhóm cần rà soát các yếu tố sau:

- Trạng thái giao diện cần rõ:
  - đang chờ duyệt
  - đã duyệt
  - bị từ chối
  - danh sách rỗng
  - lỗi kết nối/giới hạn ngân sách

- Bố sung trạng thái tæ:
  - nút kích hoạt rõ ràng
  - nếu admin không đủ quyền thì không hiển thị chức năng
  - hạn mức ngân sách, thời lượng quảng cáo, target group phải được kiểm tra kỹ

- Khả năng tiếp cận trên responsive:
  - màn hình đảm bảo hiển thị tốt trên mobile
  - không quá dài, không làm mất thông tin quan trọng
  - layout còn rõ khi ở chế độ 360px
  - dùng màu sắc có độ tương phản tốt để phân biệt trạng thái

- Minh bạch cho người xem:
  - Người xem cần thấy thời lượng xem, số xu nhận được, điều kiện nhận xu
  - Ví xu phải có ngày giờ, số xu cộng/trừ rõ ràng
  - Giao dịch cần hiển thị đúng theo thời gian thực

- An toàn cho thao tác quản trị:
  - Cảnh báo khi hành động khóa tài khoản, từ chối quảng cáo, hoặc hoàn xu
  - Ghi log hành động admin
  - Không để admin thực hiện thao tác thiếu kiểm tra
  - Nên có khoảng thời gian xác nhận trước khi thực thi hành động quan trọng

7. Tiêu chí hoàn thiện UI

UI được xem là đạt chuẩn nếu:
- Trạng thái rõ ràng và nhất quán
- Bố cục dễ đọc, không nhầm lẫn
- Màu sắc dùng để biểu thị trạng thái rõ ràng và không phụ thuộc hoàn toàn vào màu
- Nút thao tác có kích thước đủ lớn và có phản hồi khi nhấn
- Người dùng biết ngay mình đang ở đâu trong luồng
- Màn hình phục vụ đúng case đã định nghĩa:
  - Xem quảng cáo
  - Nhận xu
  - Ví xu
  - Đổi quà
  - Admin duyệt quảng cáo

8. Kết luận

Màn hình admin “Duyệt quảng cáo” là một phần rất quan trọng của hệ thống vì nó là nơi quyết định nội dung quảng cáo có được chạy hay không. Đây không chỉ là một UI đơn thuần, mà còn là điểm kiểm soát chất lượng nghiệp vụ, bảo vệ sự công bằng cho người xem và bảo vệ hệ thống khỏi quảng cáo sai hoặc không phù hợp.

Như vậy, Sprint 2 không chỉ xây dựng các sơ đồ thiết kế, mà còn định hình giao diện quản trị để:
- giảm sai sót
- tăng tính minh bạch
- đảm bảo trải nghiệm người dùng
- hỗ trợ admin ra quyết định nhanh và chính xác.

Nếu bạn muốn, tôi có thể làm tiếp một trong các phần sau:
- Bản tóm tắt 1 trang cho phần admin UI
- Bản slide PowerPoint 5–7 slide theo chuẩn thuyết trình
- Bản script thuyết trình 10 phút cho phần admin + review cuối sprint.

## @sonthanhnguyendz777-dotcom

bây giờ hãy tổng hợp tất cả hình ảnh bên trên mà tôi đã gửi , bạn hãy giúp tôi gộp lại thành bản báo cáo hoàn chỉnh 

## Copilot

Dưới đây là bản báo cáo tổng hợp hoàn chỉnh cho Sprint 2 của dự án YouTube Xu – Xem quảng cáo nhận xu, được tổng hợp từ các hình ảnh đã gửi. Tôi giữ nguyên các nội dung quan trọng và sắp xếp thành một báo cáo thống nhất, dễ trình bày trước giảng viên hoặc nộp báo cáo.

BÁO CÁO SPRINT 2
Dự án: YouTube Xu – Xem quảng cáo nhận xu

1. Giới thiệu

Sprint 2 là giai đoạn quan trọng trong quá trình phát triển hệ thống YouTube Xu, tập trung vào việc hoàn thiện thiết kế hệ thống để chuẩn bị cho giai đoạn lập trình thực tế ở các sprint tiếp theo. Nội dung chính của sprint này bao gồm:
- Xác định mục tiêu và phạm vi của dự án
- Thiết kế luồng nghiệp vụ chính
- Đặc tả API
- Xây dựng sơ đồ lớp
- Vẽ sequence diagram
- Thiết kế wireframe
- Duyệt quảng cáo_admin
- Rà soát và đánh giá sự hoàn thiện

Mục tiêu của Sprint 2 là xây dựng nền tảng thiết kế cho các chức năng cốt lõi:
- Xem quảng cáo và nhận xu
- Ví xu và lịch sử giao dịch
- Đổi quà
- Quản lý quảng cáo của nhà quảng cáo
- Duyệt quảng cáo của admin

2. Mục tiêu Sprint 2

Mục tiêu của Sprint 2 là “hoàn thiện thiết kế hệ thống cho luồng công việc xem quảng cáo – nhận xu”, đồng thời xây dựng các tài liệu thiết kế cần thiết để hỗ trợ lập trình ở các sprint sau.

Nội dung cần hoàn thành trong sprint:
- Sequence diagram cho use case chính
- Class diagram
- Đặc tả REST API
- Wireframe giao diện
- Rà soát chéo với SRS và DB
- Xác định Definition of Done

Sprint 2 kéo dài 2 tuần:
- Tuần 3: lên kế hoạch và làm task
- Tuần 4: review và retrospective

3. Product Backlog được đưa vào Sprint

Các user story nào được đưa vào Sprint 2 là:

- PB-04: US-VW-02 – Tra cứu & lọc quảng cáo
- PB-05: US-VW-03 – Xem quảng cáo & nhận xu
- PB-06: US-VW-05 – Ví xu & lịch sử giao dịch
- PB-07: US-AV-02 – Chọn đối tượng mục tiêu

Tất cả đều là Must-have, do đó có mức ưu tiên cao và trực tiếp phục vụ chức năng cốt lõi của sản phẩm.

4. Phân rã công việc (Sprint Backlog)

Sprint Backlog bao gồm các task sau:

- T2-01: Vẽ Sequence Diagram UC-01 – Xem quảng cáo & nhận xu
  - Đầu ra: SEQ-01 (hình 1)
  - Ước lượng: 6 giờ
  - Phụ trách: Thành viên 1

- T2-02: Vẽ Sequence Diagram UC-02 – Đổi quà và UC-04/05 – Tạo & duyệt quảng cáo
  - Đầu ra: SEQ-01 (hình 2, 3)
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 2

- T2-03: Thiết kế Class Diagram (11 lớp)
  - Đầu ra: CLS-01
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 3

- T2-04: Đặc tả REST API cho 4 phần hệ
  - Đầu ra: API-01
  - Ước lượng: 8 giờ
  - Phụ trách: Thành viên 4

- T2-05: Thiết kế wireframe 5 màn hình chính
  - Đầu ra: UI-01
  - Ước lượng: 10 giờ
  - Phụ trách: Thành viên 5

- T2-06: Rà soát chéo: đối chiếu thiết kế với SYS-02 và DB-03
  - Đầu ra: Bản rà soát
  - Ước lượng: 4 giờ
  - Phụ trách: Cả nhóm

5. Định nghĩa hoàn thành (Definition of Done)

Một task được coi là hoàn thành khi:
- Mọi sơ đồ khớp với use case SYS-02 và các bảng DB-03
- Mỗi API ghi rõ đầu vào, đầu ra, mã lỗi và quyền truy cập
- Wireframe thể hiện đủ thông tin trong luồng người dùng
- Được giảng viên hoặc nhóm review xét chốt phiên bản
- Mọi yêu cầu đã được chốt trước khi sprint kết thúc

Những điều cần đảm bảo:
- Mỗi luồng nghiệp vụ cần có điều kiện rõ ràng
- Mỗi alt/opt phải thể hiện đúng trường hợp hợp lệ và ngoại lệ
- Sơ đồ không được mơ hồ
- Tính nguyên tử của nghiệp vụ phải được giữ nguyên

6. Đặc tả REST API

Base URL: /api/v1

Mã lỗi chính:
- 400: lỗi dữ liệu đầu vào
- 401: chưa đăng nhập / token không hợp lệ
- 403: không có quyền
- 404: không tìm thấy
- 409: xung đột nghiệp vụ
- 429: vượt quá giới hạn

Xác thực:
- JWT trong header Authorization

6.1. Phần 1: Tài khoản
- POST /auth/register
  - Guest
  - Đăng ký, gửi OTP
  - 409 email/SĐT trùng
  - 400 dữ liệu không hợp lệ

- POST /auth/verify-otp
  - Guest
  - Xác thực OTP, tạo tài khoản
  - 400 nếu OTP sai hoặc hết hạn

- POST /auth/login
  - Guest
  - Đăng nhập, trả JWT
  - 401 sai thông tin đăng nhập
  - 403 tài khoản bị khóa

- GET/PUT /me
  - Mọi vai trò
  - Xem/cập nhật hồ sơ người dùng

6.2. Phần 2: Người xem – quảng cáo & ví
- GET /ads?category=&sort=
  - Viewer
  - Danh sách quảng cáo được phép xem hôm nay

- POST /views/start
  - Viewer
  - Bắt đầu xem quảng cáo, trả view_token
  - 429 nếu hết hạn mức
  - 409 nếu đã xem hôm nay
  - 409 nếu hết ngân sách

- POST /views/heartbeat
  - Viewer
  - Báo động xem mỗi 5 giây
  - 409 nếu token không hợp lệ

- POST /views/complete
  - Viewer
  - Hoàn tất, cộng xu
  - 409 nếu chưa xem đủ thời lượng

- GET /wallet
  - Viewer
  - Số dư và hạn mức ngày

- GET /wallet/transactions?type=&page=
  - Viewer
  - Lịch sử giao dịch ví

6.3. Phần 3: Người xem – đổi quà
- GET /rewards
  - Mọi vai trò
  - Danh mục quà, tồn kho

- POST /redemptions
  - Viewer
  - Yêu cầu đổi quà, gửi OTP
  - 409 thiếu xu
  - 429 hết hạn/giới hạn đổi

- POST /redemptions/confirm
  - Viewer
  - Xác nhận OTP, trừ xu
  - 400 nếu OTP sai
  - 429 khóa 15 phút

- GET /redemptions
  - Viewer
  - Danh sách đơn đổi quà và trạng thái

6.4. Phần 4: Nhà quảng cáo
- POST /ads
  - Advertiser
  - Tạo chiến dịch (PENDING)
  - 400 nếu thời gian hoặc ngân sách không hợp lệ
  - 409 nếu ngân sách không đủ

- PATCH /ads/{id}/status
  - Advertiser
  - Tạm dừng / tiếp tục

- GET /ads/{id}/report
  - Advertiser
  - Báo cáo hiệu quả chiến dịch

6.5. Phần 5: Quản trị viên
- GET /admin/ads?status=PENDING
  - Admin
  - Danh sách quảng cáo chờ duyệt

- PATCH /admin/ads/{id}
  - Admin
  - Duyệt / từ chối

- GET/PATCH /admin/redemptions
  - Admin
  - Duyệt đơn đổi quà

- GET /admin/fraud
  - Admin
  - Danh sách cảnh báo gian lận

- POST /admin/fraud/{user_id}/action
  - Admin
  - Ignore / invalidate / lock

- PUT /admin/xu-rules
  - Admin
  - Cấu hình quy tắc xu

- GET /admin/reports/export
  - Admin
  - Xuất Excel xu phát hành/đổi quà

7. Sơ đồ lớp (Class Diagram)

Class Diagram mô hình hóa các thành phần chính của hệ thống:

- User / Viewer / Advertiser / Admin
  - userId, email, phone, fullName, passwordHash, role, status, xuBalance, createdAt
  - Vai trò: Viewer nhận xu; Advertiser tạo quảng cáo; Admin duyệt và quản lý

- Ad
  - adId, title, description, videoUrl, durationSec, rewardXu, budget, status, isAvailableForViewer
  - Quảng cáo có thể bị tạm dừng, hoạt động, kết thúc hoặc bị từ chối

- AdTargeting
  - gender, ageFrom, ageTo, province
  - matches(viewer)

- AdCategory
  - Danh mục như Giáo dục, Game, Âm thực

- AdView
  - viewId, adId, userId, viewToken, startedAt, completedAt, watchedSeconds, status
  - Dùng để kiểm tra xem người dùng có đủ tiêu chí nhận xu hay không

- Reward / Redemption
  - Reward: quà
  - Redemption: yêu cầu đổi quà
  - status: PENDING, APPROVED, DELIVERED, REJECTED

- XuTransaction
  - txnId, type, amount, balanceAfter, note, createdAt
  - Loại giao dịch: EARN, REDEEM, REFUND, BONUS, ADJUST

Các Enum:
- Role: VIEWER, ADVERTISER, ADMIN
- AccountStatus: ACTIVE, LOCKED
- AdStatus: DRAFT, PENDING, ACTIVE, PAUSED, ENDED, REJECTED
- ViewStatus: STARTED, COMPLETED, INVALID
- RedemptionStatus: PENDING, APPROVED, DELIVERED, REJECTED
- TxnType: EARN, REDEEM, REFUND, BONUS, ADJUST

8. Sequence Diagram

8.1. Use case UC-01: Xem quảng cáo & nhận xu
Luồng chính:
- Người dùng chọn quảng cáo
- Gửi POST /views/start(ad_id)
- Backend kiểm tra điều kiện
- Nếu hợp lệ: tạo view_token và lưu dữ liệu
- Gửi POST /views/heartbeat(token)
- Gửi POST /views/complete(token)
- Backend kiểm tra thời lượng xem
- Nếu đủ: cộng xu, INSERT tới xu_transactions(EARN), COMMIT
- Nếu chưa đủ: trả lỗi NOT_WATCHED_ENOUGH

Điểm quan trọng:
- Mỗi view_token chỉ được xử lý 1 lần
- Cộng xu phải có transaction
- Không cộng xu nếu không đạt đủ thời lượng
- Giới hạn ngày và số lượt xem cần được kiểm tra

8.2. Use case UC-02: Đổi xu lấy quà
Luồng chính:
- Người dùng chọn quà
- Gửi POST /redemptions
- Backend kiểm tra số dư, giới hạn ngày, OTP
- Nếu đủ: yêu cầu OTP
- Gửi POST /redemptions/confirm(otp)
- Hệ thống INSERT redemption
- INSERT xu_transactions(REDEEM)
- COMMIT
- Nếu số xu > 50.000đ: phải chờ admin duyệt
- Nếu số xu ≤ 50.000đ: auto approve
- Nếu từ chối: hoàn xu bằng giao dịch REFUND

8.3. Use case UC-04 & UC-05: Tạo quảng cáo & duyệt quảng cáo
- Nhà quảng cáo tạo quảng cáo
- Backend validate 5–60s, ngân sách > 0
- INSERT ads(PENDING)
- Admin gọi GET /admin/ads?status=PENDING
- Admin review và PATCH /admin/ads/{id}
- Nếu approve → status = ACTIVE
- Nếu reject → status = REJECTED

9. Wireframe giao diện

9.1. Màn hình danh sách quảng cáo (UC-V01)
Giao diện bao gồm:
- Header: “YouTube Xu” + số xu hiện có
- Thanh tiến độ ngày
- Bộ lọc theo category
- Các card quảng cáo dạng danh sách
- Nút “Xem +10 xu”, “Xem +5 xu”
- Footer: Xem QC / Ví xu / Đổi quà / Hồ sơ

Mục tiêu:
- Người dùng dễ chọn quảng cáo
- Dễ hiểu tiến độ số lượt và xu trong ngày
- Phản hồi rõ ràng sau khi xem 1 quảng cáo

9.2. Màn hình xem quảng cáo (UC-V02)
Các thành phần:
- Video giả lập
- Thời gian xem hiện tại
- Thông tin tên quảng cáo
- Cảnh báo khi không đủ điều kiện nhận xu
- Nút nhận xu sau khi hết thời lượng

Mục tiêu:
- Giảm nguy cơ gian lận
- Thông báo rõ người dùng cần xem đủ thời lượng
- Dễ kiểm tra tính hợp lệ của lượt xem

9.3. Màn hình Ví xu & lịch sử giao dịch (UC-V03)
Các thành phần:
- Số dư ví
- Nút Đổi quà
- Tabs: Tất cả / Nhận xu / Đã đổi
- Lịch sử giao dịch cụ thể:
  - cộng xu
  - trừ xu
  - đổi quà
  - ngày giờ giao dịch

Mục tiêu:
- Minh bạch và rõ ràng
- Người dùng biết số xu hiện tại và lý do cộng/trừ

9.4. Màn hình admin duyệt quảng cáo (UC-AD01)
Giao diện admin gồm:
- Sidebar menu
- Bảng danh sách quảng cáo chờ duyệt
- Nút Duyệt / Từ chối
- Khung preview video
- Ghi chú lý do từ chối

Mục tiêu:
- Admin dễ kiểm tra nội dung quảng cáo
- Duyệt nhanh
- Kiểm soát chất lượng quảng cáo trước khi chạy

10. Rủi ro và kiểm soát

Rủi ro chính:
- Lừa đảo bằng cách giả mạo tab, không xem đủ thời lượng
- Xung đột nghiệp vụ khi cộng/trừ xu
- Lặp lại request trong lúc đổi quà hoặc hoàn tất xem quảng cáo
- Admin từ chối hoặc duyệt sai
- Không đủ kiểm tra giám sát hoạt động gian lận

Kiểm soát cần có:
- Xác thực JWT, role-based access
- Idempotent cho /views/complete và API đổi quà
- Transaction cho cộng xu, trừ xu, đổi quà
- Giữ log và nhật ký quản trị
- Có kiểm tra trạng thái hợp lệ theo luồng

11. Rà soát và bổ sung hoàn thiện

Khuyến nghị bổ sung:
- Giao diện cần rõ trạng thái đang tải, thành công, lỗi
- Màu sắc phải có độ tương phản đủ để rõ ràng
- Hạn mức ngân sách, số lượt xem, số xu cần được hiển thị bằng văn bản và thanh trạng thái
- Nút thao tác cần đủ lớn, rõ ràng và dễ chạm trên mobile
- Màn hình cần responsive để hiển thị tốt ở 360px
- Có cảnh báo nếu người dùng không đủ điều kiện nhận xu
- Quá trình đổi quà và admin duyệt cần có xác nhận trước khi thực hiện

12. Kết luận

Sprint 2 đã xây dựng một nền tảng thiết kế rõ ràng cho hệ thống YouTube Xu. Từ các thành phần:
- product backlog
- API design
- class diagram
- sequence diagram
- wireframe
- admin approval screen

…ta thấy hệ thống có cấu trúc và logic nghiệp vụ rõ ràng, phù hợp để chuyển sang giai đoạn triển khai code ở sprint tiếp theo.

Các điểm mạnh của Sprint 2:
- Xác định đúng nghiệp vụ chính
- Chia rẽ cấu trúc backend/frontend rõ ràng
- Có API, sơ đồ lớp và luồng nghiệp vụ đầy đủ
- UI dễ hiểu, phù hợp với mobile
- Đã xác định các rủi ro và tiêu chí hoàn thiện

Các điểm cần phát triển thêm:
- Tích hợp thực tế API YouTube
- Kiểm tra idempotent và transaction nghiêm ngặt hơn
- Cần phần logging và admin audit rõ ràng hơn
- Nên ưu tiên tối ưu hóa trải nghiệm người dùng và bảo mật

Tổng kết:
Sprint 2 là giai đoạn đặt nền móng kỹ thuật và nghiệp vụ cho toàn bộ dự án, đồng thời tạo ra một hệ thống quy chuẩn, nhất quán, dễ triển khai và dễ kiểm thử trong các sprint sau.

Nếu bạn muốn, tôi có thể làm tiếp một trong các bước sau:
- Chuyển bản báo cáo này thành dạng slide trình bày 8–10 trang
- Viết thành bản “thuyết trình 15 phút” theo kiểu nói trước lớp
- Chuyển thành file Word-style với tiêu đề, phần mục lục và kết luận ngắn gọn để bạn copy thẳng vào báo cáo.
