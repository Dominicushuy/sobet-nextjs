Xây dựng một trang mới trong admin để quản lý kết quả đối soát của từng user
trong ngày, bao gồm các tính năng sau:

- Sau khi đối soát thành công trong trang
  `src/app/(private)/admin/bet-codes/page.jsx` thì tạo mới hoặc cập nhật dữ liệu
  trong bảng `verifications`, (bảng này hiện tại đã tạo ở Supabase còn khá sơ
  sài cần cập nhật thêm). Trang này sẽ hiện thị danh sách các user đã đối soát
  trong ngày, bao gồm các thông tin sau:

  - Tên user
  - Số lượng mã đã đối soát
  - Số lượng mã trúng
  - Số lượng mã không trúng
  - Chung:

    - Tổng số tiền đóng (`total_stake_amount`)
      - Lấy tổng của cột `original_stake` trong bảng `bet_entries`
    - Tổng số tiền trúng (`total_winning_amount`)
      - Lấy tổng của cột `actual_winning` trong bảng `bet_entries`
    - Tổng số tiền lãi/lỗ (`total_profit_amount`)
      - Tính bằng `total_winning_amount` - `total_stake_amount`
    - Tổng số tiền thu/chi phí (`total_cost_amount`)

      - Nếu `total_profit_amount` > 0 (Trường hợp thu) thì lấy
        `total_cost_amount` nhân với cột `export_price_rate` trong bảng
        `user_commission_settings`.
      - Nếu `total_profit_amount` < 0 (Trường hợp thu) thì lấy
        `total_cost_amount` nhân với cột `return_price_rate` trong bảng
        `user_commission_settings`.

  - Ngoài ra tính chi tiết cho từng miền (Miền Bắc, Miền Trung, Miền Nam) như
    sau:

    - Miền Bắc:

      - Tổng số tiền đóng của Miền Bắc (`total_stake_amount_north`)
      - Tổng số tiền trúng của Miền Bắc (`total_winning_amount_north`)
      - Tổng số tiền lãi/lỗ của Miền Bắc (`total_profit_amount_north`)
      - Tổng số tiền thu/chi phí của Miền Bắc (`total_cost_amount_north`)

    - Miền Trung:

      - Tổng số tiền thu/chi phí của Miền Trung (`total_cost_amount_central`)
      - Tổng số tiền đóng của Miền Trung (`total_stake_amount_central`)
      - Tổng số tiền trúng của Miền Trung (`total_winning_amount_central`)
      - Tổng số tiền lãi/lỗ của Miền Trung (`total_profit_amount_central`)

    - Miền Nam:
      - Tổng số tiền thu/chi phí của Miền Nam (`total_cost_amount_south`)
      - Tổng số tiền đóng của Miền Nam (`total_stake_amount_south`)
      - Tổng số tiền trúng của Miền Nam (`total_winning_amount_south`)
      - Tổng số tiền lãi/lỗ của Miền Nam (`total_profit_amount_south`)
