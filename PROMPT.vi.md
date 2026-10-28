# Prompt triển khai Lunch Together Merchant

Bạn là kỹ sư full-stack chịu trách nhiệm xây dựng, kiểm thử và bàn giao một hệ thống riêng cho cửa hàng/nhà hàng mang tên **Lunch Together Merchant**. Hệ thống phải dùng chung Firebase với ứng dụng **Lunch Together / Cơm Nhà**, đồng bộ thực đơn, đơn cơm và trạng thái xử lý; không chỉ làm mockup.

## Bối cảnh và nguồn sự thật

- Mã nguồn ứng dụng khách: https://github.com/devoralabsapp/lunch-together. Đọc mã và Firestore Rules hiện tại trước khi thay đổi tích hợp.
- Next.js 16, React 19, TypeScript, Node.js 22, Firebase Authentication và **Firestore Standard**. Deploy Vercel. Google là phương thức đăng nhập merchant. Không dùng service-account key, Firebase Admin SDK hoặc OIDC.
- Trình duyệt truy cập Firestore bằng Firebase Web SDK. Quyền phải được cưỡng chế trong Security Rules, không chỉ ẩn nút.
- Ứng dụng khách có khách ẩn danh, Google, quản trị, nhiều món/số lượng, thanh toán gộp, hoàn tiền và số dư. Giữ nguyên các nghiệp vụ đó.
- Tiếng Việt mặc định, có tiếng Anh; tên người/món/ghi chú do người dùng nhập giữ nguyên. Ngày nghiệp vụ và giờ chốt 09:30 dùng múi giờ Việt Nam, tiền nguyên VND.

## Sản phẩm phải làm

1. Màn đăng nhập Google tạo hồ sơ chờ duyệt; chỉ quản trị hệ thống được phê duyệt trước khi mở chức năng cửa hàng. Giữ các quyền đã cấp từ phiên bản cũ. Có chế độ dữ liệu mẫu tách khỏi Firebase, không giả làm dữ liệu thật.
2. Tổng quan theo nhà hàng và ngày: số dòng đơn, số suất, tổng giá trị đơn, số món; ghi rõ tổng giá trị đơn không phải số tiền đã thu. Hiển thị ngày đã liên kết và nhật ký gần đây.
3. Danh mục món riêng: thêm món, sửa giá, ngừng/mở lại món. Không xóa lịch sử và không tự động sửa giá trên đơn đã đặt.
4. Thực đơn theo ngày: chọn món từ danh mục hoặc nhập nhiều dòng, sửa giá, công bố vào đúng collection của Cơm Nhà. Chỉ chủ/quản lý được công bố cho ngày đã gắn nhà hàng. Cảnh báo xung đột khi thực đơn đổi ở thiết bị khác. Ngày mới ở chế độ `auto`; merchant không tự mở lại ngày đã chốt.
5. Bếp và đơn hàng: nghe thay đổi trực tiếp của đơn Cơm Nhà; tính theo **suất**, loại đơn hủy; nhóm theo món + đơn giá, cộng số suất cho từng ghi chú. Ví dụ tổng 8 suất nhưng 1 suất note thì chỉ ghi `1× Ít cơm, không hành`; không hiện dòng “7 suất không có ghi chú”.
6. Trạng thái: mới → đã nhận → đang nấu → sẵn sàng → đang giao → hoàn tất. Chủ/quản lý nhận và giao; nhà bếp chỉ chuyển bước nấu/sẵn sàng. Không bỏ qua bước. Khi khách đổi món, số lượng, ghi chú hoặc hủy sau khi nhận, cả hai ứng dụng phải báo cần xác nhận lại; không dùng thay đổi thanh toán đơn thuần để bắt xác nhận bếp lại.
7. Nhân sự theo UID Google, vai trò `owner`, `manager`, `kitchen`, có khóa/mở. Một tài khoản đã duyệt có thể sở hữu nhiều cửa hàng; một nhân sự có nhiều vai trò theo từng cơ sở. Chủ chỉ quản lý nhân viên cấp thấp hơn; không tự nâng vai trò hay di chuyển nhân sự sang nhà hàng khác. Chủ đã duyệt có thể tạo cơ sở mới. Quản trị Cơm Nhà phê duyệt tài khoản và liên kết ngày.
8. Thông tin cửa hàng: tên, điện thoại, địa chỉ. Nhật ký thêm mới, không sửa/xóa. Có in danh sách bếp và xuất JSON tương thích hợp đồng restaurant v1.
9. Sáu theme chọn độc lập: Classic, Command Line đen, VS Code, Excel, Midnight, Playful Retro Neo-Brutalism; mặc định Retro/tiếng Việt, có tiếng Anh và lưu lựa chọn. Giao diện desktop/mobile chuyên nghiệp, dễ dùng trong bếp, màu cream/pastel với viền đen và bóng cứng nhẹ lấy cảm hứng Retro; phân cấp rõ, trạng thái tải/lỗi/rỗng, focus bàn phím, reduced motion. Không thêm chức năng giả hoặc số liệu kinh doanh bịa đặt.

## Hợp đồng tương thích bắt buộc

Không đổi schema của `days/{dayId}`, `dishes`, `orders` hay dữ liệu tiền hiện hữu. Một ngày gắn một merchant bằng collection mở rộng:

```text
merchants/{merchantId}
merchants/{merchantId}/catalog/{dishId}
merchants/{merchantId}/events/{eventId}
merchantUsers/{uid}
merchantApplications/{uid}
merchantApprovalEvents/{eventId}
merchantStoreUsers/{merchantId}~{uid}
merchants/{merchantId}/menus/{date}/dishes/{dishId}
merchantDays/{dayId}
merchantFulfillments/{dayId}

days/day-YYYY-MM-DD
days/{dayId}/dishes/{sha256(lowercase(NFC(name)))}
days/{dayId}/orders/{existingOrderId}
```

- Liên kết `merchantDays/{dayId}` do quản trị Cơm Nhà tạo và bất biến để không chuyển lịch sử nhầm nhà hàng.
- Thực đơn và đơn là cùng một dữ liệu giữa hai app, tránh sao chép gây phân kỳ. Merchant nghe orders/dishes/day realtime. Cơm Nhà vẫn đọc theo cơ chế cập nhật hiện có và nghe trạng thái nhà hàng trực tiếp.
- Merchant chỉ được thêm quyền ghi thực đơn đã gắn và trạng thái xử lý. Không cấp thêm quyền xác nhận `paid`, sửa tiền nhận/hoàn/số dư, đọc khóa API hoặc tích hợp thanh toán.
- Collection đơn khách vốn được đọc chung trong hệ thống hiện tại. Phân quyền tenant mới bảo vệ quản trị merchant, catalog, thành viên và nhật ký; không quảng cáo rằng dữ liệu đơn khách đã trở thành riêng tư theo tenant.
- Fingerprint danh sách bếp bao gồm `[id,dish,quantity,price,note,cancelled]`, sắp theo ID rồi SHA-256 JSON UTF-8; không gồm tiền đã thu hoặc `updatedAt`. Đây là tín hiệu thay đổi vận hành, không phải chứng từ thanh toán hoặc cơ chế khóa đơn.
- Snapshot nhà hàng tiếp tục là `{version:1,date,generatedAt,rows:[{dish,quantity,unitPrice,note}]}`. Không xuất danh tính, UID hoặc trạng thái tiền vào snapshot.

## Kiểm thử và bàn giao

- Dùng Firebase Auth/Firestore Emulator với project `demo-`; không tạo đơn thử trong production.
- Kiểm thử schema, giới hạn dữ liệu, UID bất biến, nâng quyền, truy cập chéo merchant, ngừng quyền, chuyển trạng thái, nhật ký bất biến, cập nhật menu và bảo toàn tài chính cũ. Chạy cả bộ regression Cơm Nhà.
- Kiểm thử thật trên trình duyệt: merchant đăng món → Cơm Nhà thấy món → khách đặt/sửa/hủy → merchant thấy thay đổi → trạng thái chuẩn bị hiện về Cơm Nhà. Kiểm tra narrow screen và VI/EN.
- Viết README, tài liệu hợp đồng, file biến môi trường mẫu rỗng, MIT, CI kiểm tra build/typecheck/tests. Lưu prompt này trong repo để người khác tiếp tục phát triển.
- Repo public không có `.env.local`, dữ liệu thật, ID quản trị thực tế, source workbook, token, private key hoặc dấu vết browser auth. Rules tham chiếu dùng placeholder UID và phải bảo toàn Rules hiện hữu.
- Tạo repo public `lunch-together-merchant`, deploy Vercel từ commit đã kiểm thử, xác minh URL và SHA. Nếu cần người dùng Publish Rules hoặc Authorized domains, đưa file/domain chính xác cùng kết quả kiểm thử; tiếp tục công việc độc lập trong lúc chờ. Không tuyên bố tích hợp production hoàn tất khi các bước này chưa xong.

Tự quyết các chi tiết triển khai thường lệ để hoàn thành sản phẩm; báo lại các quyết định ảnh hưởng dữ liệu, quyền hoặc vận hành. Không mở rộng sang thanh toán merchant, kho nguyên liệu, thuế hay kế toán nếu chưa được yêu cầu.

Thực đơn riêng của từng cơ sở có thể lưu cùng ngày với món/giá khác nhau. Chỉ công bố thực đơn sang ngày khách sau khi quản trị liên kết đúng cơ sở. Quyền sở hữu bất biến, nhân sự chỉ được cấp cho tài khoản đã duyệt; tạm ngừng không tự chuyển người dùng về portal khách.

## Cập nhật quản lý cửa hàng và tạo ngày

Menu Merchant desktop ở bên trái, bộ chọn nhà hàng cạnh ngày và giữ ngày khi đổi cơ sở. Tab Cửa hàng là danh sách chung có thêm/sửa/xóa vào lưu trữ/khôi phục, không có ô ngày hoặc cảnh báo liên kết. Thực đơn cơ sở dùng form/bảng như Danh mục món. Cơm Nhà tạo ngày mới có Nhập thủ công hoặc Liên kết nhà hàng; nhánh liên kết lấy thực đơn đúng ngày đã lưu và tạo ngày/menu/liên kết/nhật ký nguyên tử, chặn ngày trùng và cửa hàng ngừng hoạt động. Xem docs/STORES-AND-MEAL-DAYS.md.

## Danh mục chung và đăng thực đơn trực tiếp

Danh mục món dùng chung giữa các cơ sở cùng ownerId bất biến; không gộp khác chủ. Chủ/quản trị tự động gộp catalog cũ một lần, giữ dữ liệu cũ; món trùng tên dùng bản cập nhật mới nhất ban đầu, các lần sau giữ chỉnh sửa trong danh mục chung. Quản lý sửa món sau khởi tạo; bếp chỉ đọc. Mọi truy cập kiểm tra quyền thành viên hiện tại.

Thực đơn đồng bộ dùng form/bảng Sửa/Bỏ món như thực đơn cơ sở. Nút Đăng thực đơn lưu offers theo cơ sở/ngày ngay, không cần liên kết trước. Cơm Nhà ưu tiên offers khi tạo ngày liên kết, fallback thực đơn cơ sở cũ. Khi đã gắn đúng cơ sở, đăng cập nhật offer và menu khách nguyên tử; không đổi liên kết, đơn cũ hay tiền. Xem docs/SHARED-CATALOG-AND-MENUS.md.

## Thực đơn cơ sở dùng lại hằng ngày

Bỏ màn Thực đơn đồng bộ Cơm Nhà, giữ một bảng Thực đơn riêng của cơ sở có nút Đăng thực đơn. Mỗi bản đã đăng có hiệu lực từ ngày được chọn, dùng tiếp cho các ngày sau tới bản đăng mới. Dùng offers hiện có, truy vấn date <= ngày phục vụ rồi giảm dần/limit 1; bản tương lai không lùi về quá khứ. Sửa món chỉ là bản nháp cho tới khi đăng. Giữ snapshot ngày và giá đơn cũ, đồng bộ đúng ngày đã gắn nếu đăng cho ngày đó. Không đổi Rules hoặc quyền tài chính. Xem docs/REUSABLE-BRANCH-MENU.md.
