<!-- Xây dựng trang kết quả xổ số cho role Super Admin và Admin:

- Trang bao gồm các chức năng lấy kết quả xổ số theo 3 miền Bắc, Miền Trung và
  Miền Nam.

Lịch có kết quả xổ số trong ngày:

- Miền Nam: 16h30
- Miền Trung: 17h15
- Miền Bắc: 18h00 -->

<!-- Tôi muốn xây dựng trang lấy kết qủa xổ số cho role Super Admin, Admin, và User.

- Trang bao gồm kết quả xổ số theo 3 miền Bắc, Miền Trung và Miền Nam.
- Hệ thống sẽ tự động lấy kết quả xổ số từ bên thứ 3 và lưu vào cơ sở dữ liệu.
  Nếu dữ liệu đã có trong cơ sở dữ liệu thì không cần lấy lại.
- Dưới đây là script để lầy kết quả xổ số từ bên thứ 3, bạn có thể map nó thành
  code chạy phù hợp với hệ thống `result_crawler.js`. Còn `ketqua_xoso.json` là
  kết quả JSON sau khi chạy script này. -->

Hãy giúp tôi xây dựng một trang đặt cược dành cho role User.

- Màn hình đặt cược giống như đoạn chat với Bot (giống như telegram). Bot sẽ
  nhận được mã cược một hoặc nhiều dòng từ người đặt cược, format,
  validation,... lại mã đặt và tự động lưu vào cơ sở dữ liệu nếu mã đó hợp lệ.
- Trong khi validate mã cược thì bot sẽ tham chiếu dữ liệu của mỗi người dùng để
  kiểm tra tra mã cược đó có hợp lệ hay không, có đặt đúng hay (tham chiếu đến
  các bảng `regions`, `user_station_access`, `user_bet_type_settings`,
  `user_commission_settings`).
- Dưới đây là quy tắc đặt cược và các ví dụ:

Hãy thay thế toàn bộ `import { BET_CONFIG } from '@/config/data'` bằng dữ liệu
trả về dynamic theo user dựa trên function
`fetchBetData (src/app/actions/bet-code.js)` (Hãy xây dựng 1 hook mới để quản lí
dữ liệu này) ở trong các files
`formatter.js, parser.js, BetCodeContext.jsx, ChatContext.jsx, services/bet/index.js, prizeCalculator.js, stakeCalculator.js, src/utils`

Lưu ý: Vì các file rất dài nên làm từng bước, tôi sẽ hỏi bạn ngay sau đó. Hãy
bắt đầu với file context trước `BetCodeContext.jsx, ChatContext.jsx`
