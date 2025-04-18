Xây dựng một trang mới trong admin để quản lý kết quả đối soát của từng user
trong ngày, bao gồm các tính năng sau:

- Lấy danh sách user mà admin đó quản lý (tham khảo function `fetchAdminUsers`),
  sau đó lấy được danh sách các mã cược mà users đó đã cược trong ngày cụ thể
  (tham khảo function `fetchAdminBetEntries`) trong file
  `src/app/actions/bet-entries.js` để tính toán các thông tin sau:

- Sử dụng component `FilterCard` để lọc dữ liệu theo ngày và theo từng user.

- Mỗi user sẽ hiển thị Card Table chứa các thông tin sau:

  - Miền Bắc:

    - Tổng số tiền đóng của Miền Bắc (`total_stake_amount_north`)
    - Tổng số tiền trúng của Miền Bắc (`total_winning_amount_north`)
    - Tổng số tiền lãi/lỗ của Miền Bắc (`total_profit_amount_north`)
    - Tổng số tiền thu/chi phí của Miền Bắc (`total_cost_amount_north`)
    - Tổng số mã cược của Miền Bắc (`total_bet_code_north`)
    - Tổng số mã cược đã trúng của Miền Bắc (`total_bet_code_winning_north`)
    - Tổng số mã cược đã thua của Miền Bắc (`total_bet_code_losing_north`)

  - Miền Trung:

    - Tổng số tiền đóng của Miền Trung (`total_stake_amount_central`)
    - Tổng số tiền trúng của Miền Trung (`total_winning_amount_central`)
    - Tổng số tiền lãi/lỗ của Miền Trung (`total_profit_amount_central`)
    - Tổng số tiền thu/chi phí của Miền Trung (`total_cost_amount_central`)
    - Tổng số mã cược của Miền Trung (`total_bet_code_central`)
    - Tổng số mã cược đã trúng của Miền Trung (`total_bet_code_winning_central`)
    - Tổng số mã cược đã thua của Miền Trung (`total_bet_code_losing_central`)

  - Miền Nam:
    - Tổng số tiền đóng của Miền Nam (`total_stake_amount_south`)
    - Tổng số tiền trúng của Miền Nam (`total_winning_amount_south`)
    - Tổng số tiền lãi/lỗ của Miền Nam (`total_profit_amount_south`)
    - Tổng số tiền thu/chi phí của Miền Nam (`total_cost_amount_south`)
    - Tổng số mã cược của Miền Nam (`total_bet_code_south`)
    - Tổng số mã cược đã trúng của Miền Nam (`total_bet_code_winning_south`)
    - Tổng số mã cược đã thua của Miền Nam (`total_bet_code_losing_south`)

Lọc dữ liệu theo từng miền ở trên sau đó xử dụng dữ liệu ở các miền để tính toán
theo công thức sau:

- Tổng số tiền đóng: Lấy tổng giá trị của cột `original_stake` trong danh sách
  mã cược của miền đó.
- Tổng số tiền trúng: Lấy tổng giá trị của cột `actual_winning` trong danh sách
  mã cược của miền đó.
- Tổng số tiền lãi/lỗ: Lấy "Tổng số tiền đóng" trừ đi "Tổng số tiền trúng" trong
  danh sách mã cược của miền đó.
- Tổng số tiền thu/chi phí:
  - Nếu "Tổng số tiền lãi/lỗ" lớn hơn 0 thì lấy "Tổng số tiền lãi/lỗ" nhân với
    cột `export_price_rate` trong bảng `user_commission_settings` của user đó.
  - Nếu "Tổng số tiền lãi/lỗ" nhỏ hơn 0 thì lấy "Tổng số tiền lãi/lỗ" nhân với
    cột `return_price_rate` trong bảng `user_commission_settings` của user đó.
- Tông số mã cược: Dựa vào dữ liệu của cột `winning_status` trong danh sách mã
  cược của miền đó.

Dưới đây là dữ liệu hiện tại trong bảng `bet_entries`:

```json
[
  {
    "id": "f0110835-13fa-4ad0-9938-2d66f21d4c9f",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "deleted",
    "created_at": "2025-04-18 14:12:22.798+00",
    "processed_at": "2025-04-18 14:13:38.299+00",
    "verified_at": null,
    "original_text": "3dmn\n02.04.87.70.63dd10",
    "formatted_text": "3dmn\n02.04.87.70.63dd10",
    "station_id": null,
    "station_data": {
      "name": "Miền Nam",
      "count": 3,
      "region": "south",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["02", "04", "87", "70", "63"],
    "amount": "10000.00",
    "stake": "240000.00",
    "potential_winning": "750000.00",
    "winning_status": null,
    "actual_winning": null,
    "reconciliation_id": null,
    "reconciliation_status": "pending",
    "verified_by": null,
    "lottery_result_id": null,
    "matched_prize_levels": null,
    "matched_numbers": null,
    "result_verified_at": null,
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "300000"
  },
  {
    "id": "ad579bea-e96b-4e20-b400-a4c65beb32a3",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:40.977+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.613+00",
    "original_text": "ag.tpho\n166.070.333xc10",
    "formatted_text": "ag.tpho\n166.070.333xc10",
    "station_id": null,
    "station_data": {
      "region": "south",
      "stations": [
        {
          "name": "An Giang",
          "region": "south"
        },
        {
          "name": "TP. HCM",
          "region": "south"
        }
      ],
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["166", "070", "333"],
    "amount": "10000.00",
    "stake": "96000.00",
    "potential_winning": "6500000.00",
    "winning_status": true,
    "actual_winning": "6500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 144,
    "matched_prize_levels": ["An Giang: seventh_prize"],
    "matched_numbers": ["166"],
    "result_verified_at": "2025-04-18 14:14:47.613+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "120000"
  },
  {
    "id": "ebf3a436-7e54-435f-847d-93782477d945",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.085+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.613+00",
    "original_text": "dnang\n640.505.111xc10",
    "formatted_text": "dnang\n640.505.111xc10",
    "station_id": 22,
    "station_data": {
      "name": "Đà Nẵng",
      "region": "central",
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["640", "505", "111"],
    "amount": "10000.00",
    "stake": "48000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.613+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "60000"
  },
  {
    "id": "c961470d-1a57-4ef1-afd2-a85515844e45",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.086+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.613+00",
    "original_text": "tpho\n829.070.222xc10",
    "formatted_text": "tpho\n829.070.222xc10",
    "station_id": 1,
    "station_data": {
      "name": "TP. HCM",
      "region": "south",
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["829", "070", "222"],
    "amount": "10000.00",
    "stake": "48000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.613+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "60000"
  },
  {
    "id": "8f8c07b7-604c-48e4-9aea-1ac1522530d6",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:40.919+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.611+00",
    "original_text": "dnang.dlak\n640.269.789xc10",
    "formatted_text": "dnang.dlak\n640.269.789xc10",
    "station_id": null,
    "station_data": {
      "region": "central",
      "stations": [
        {
          "name": "Đà Nẵng",
          "region": "central"
        },
        {
          "name": "Đắk Lắk",
          "region": "central"
        }
      ],
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["640", "269", "789"],
    "amount": "10000.00",
    "stake": "96000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.611+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "120000"
  },
  {
    "id": "c3c237ab-6cf6-4638-8c87-1eb63cc0b75c",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.679+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.614+00",
    "original_text": "2dmn\n02.87.70.44dd10",
    "formatted_text": "2dmn\n02.87.70.44dd10",
    "station_id": null,
    "station_data": {
      "name": "Miền Nam",
      "count": 2,
      "region": "south",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["02", "87", "70", "44"],
    "amount": "10000.00",
    "stake": "128000.00",
    "potential_winning": "750000.00",
    "winning_status": true,
    "actual_winning": "1500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 140,
    "matched_prize_levels": [
      "Tây Ninh: eighth_prize",
      "Tây Ninh: special_prize"
    ],
    "matched_numbers": ["87", "70"],
    "result_verified_at": "2025-04-18 14:14:47.614+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "160000"
  },
  {
    "id": "e31aa4b7-aeb2-4183-bfb7-edf24380b14b",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.075+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.614+00",
    "original_text": "2dmn\n712.323.888xc10",
    "formatted_text": "2dmn\n712.323.888xc10",
    "station_id": null,
    "station_data": {
      "name": "Miền Nam",
      "count": 2,
      "region": "south",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["712", "323", "888"],
    "amount": "10000.00",
    "stake": "96000.00",
    "potential_winning": "6500000.00",
    "winning_status": true,
    "actual_winning": "6500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 144,
    "matched_prize_levels": ["An Giang: special_prize"],
    "matched_numbers": ["323"],
    "result_verified_at": "2025-04-18 14:14:47.614+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "120000"
  },
  {
    "id": "4b738389-9e01-4c04-a4c0-c6ac5dd71a17",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.09+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.615+00",
    "original_text": "2dmt\n640.269.444xc10",
    "formatted_text": "2dmt\n640.269.444xc10",
    "station_id": null,
    "station_data": {
      "name": "Miền Trung",
      "count": 2,
      "region": "central",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["640", "269", "444"],
    "amount": "10000.00",
    "stake": "96000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.615+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "120000"
  },
  {
    "id": "5e74f6cb-c630-4f7f-918e-f3e620be9a58",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.112+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "mb\n238.923.777xc10",
    "formatted_text": "mb\n238.923.777xc10",
    "station_id": null,
    "station_data": {
      "id": null,
      "name": "Miền Bắc",
      "region": "north",
      "multiStation": false,
      "isVirtualStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["238", "923", "777"],
    "amount": "10000.00",
    "stake": "96000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "120000"
  },
  {
    "id": "07d8cc4b-021b-44d5-94f1-83ca916d32c9",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.686+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "mb\n03.53.54.78.23.88dd10",
    "formatted_text": "mb\n03.53.54.78.23.88dd10",
    "station_id": null,
    "station_data": {
      "id": null,
      "name": "Miền Bắc",
      "region": "north",
      "multiStation": false,
      "isVirtualStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["03", "53", "54", "78", "23", "88"],
    "amount": "10000.00",
    "stake": "240000.00",
    "potential_winning": "750000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "300000"
  },
  {
    "id": "2c6fc7ef-b814-4d1e-b571-c5289c5bb4f4",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.068+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "tn\n712.204.999xc10",
    "formatted_text": "tn\n712.204.999xc10",
    "station_id": 10,
    "station_data": {
      "name": "Tây Ninh",
      "region": "south",
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["712", "204", "999"],
    "amount": "10000.00",
    "stake": "48000.00",
    "potential_winning": "6500000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "60000"
  },
  {
    "id": "d30a44ee-447f-4ffb-9520-c78068b73868",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.611+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "tpho.tn\n02.04.87.70.55dd10",
    "formatted_text": "tpho.tn\n02.04.87.70.55dd10",
    "station_id": null,
    "station_data": {
      "region": "south",
      "stations": [
        {
          "name": "TP. HCM",
          "region": "south"
        },
        {
          "name": "Tây Ninh",
          "region": "south"
        }
      ],
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["02", "04", "87", "70", "55"],
    "amount": "10000.00",
    "stake": "160000.00",
    "potential_winning": "750000.00",
    "winning_status": true,
    "actual_winning": "1500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 140,
    "matched_prize_levels": [
      "Tây Ninh: eighth_prize",
      "Tây Ninh: special_prize"
    ],
    "matched_numbers": ["87", "70"],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "200000"
  },
  {
    "id": "8a092345-c268-46b6-82f0-f45e74a22e9f",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.616+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "dnang.qtri\n28.05.14.03.77dd10",
    "formatted_text": "dnang.qtri\n28.05.14.03.77dd10",
    "station_id": null,
    "station_data": {
      "region": "central",
      "stations": [
        {
          "name": "Đà Nẵng",
          "region": "central"
        },
        {
          "name": "Quảng Trị",
          "region": "central"
        }
      ],
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["28", "05", "14", "03", "77"],
    "amount": "10000.00",
    "stake": "160000.00",
    "potential_winning": "750000.00",
    "winning_status": true,
    "actual_winning": "1500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 141,
    "matched_prize_levels": [
      "Quảng Trị: eighth_prize",
      "Quảng Trị: special_prize"
    ],
    "matched_numbers": ["14", "03"],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "200000"
  },
  {
    "id": "227a0ec2-f41f-4aba-bb1e-5046ac50231e",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.713+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "dnang\n28.05.99dd10",
    "formatted_text": "dnang\n28.05.99dd10",
    "station_id": 22,
    "station_data": {
      "name": "Đà Nẵng",
      "region": "central",
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["28", "05", "99"],
    "amount": "10000.00",
    "stake": "48000.00",
    "potential_winning": "750000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "60000"
  },
  {
    "id": "771e1a7e-ed62-4616-9fa5-8ed29600b3cb",
    "user_id": "f680374f-581a-4202-b177-79399c56d142",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:08:41.073+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "3dmn\n712.070.555xc10",
    "formatted_text": "3dmn\n712.070.555xc10",
    "station_id": null,
    "station_data": {
      "name": "Miền Nam",
      "count": 3,
      "region": "south",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 2,
    "bet_type_alias": "xc",
    "numbers": ["712", "070", "555"],
    "amount": "10000.00",
    "stake": "144000.00",
    "potential_winning": "6500000.00",
    "winning_status": true,
    "actual_winning": "6500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 140,
    "matched_prize_levels": ["Tây Ninh: special_prize"],
    "matched_numbers": ["070"],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Xỉu chủ",
    "original_stake": "180000"
  },
  {
    "id": "fd60fe89-a5cb-49fd-ba22-4cfb10a7ddec",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.7+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "2dmt\n28.05.14.03.66dd10",
    "formatted_text": "2dmt\n28.05.14.03.66dd10",
    "station_id": null,
    "station_data": {
      "name": "Miền Trung",
      "count": 2,
      "region": "central",
      "multiStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["28", "05", "14", "03", "66"],
    "amount": "10000.00",
    "stake": "160000.00",
    "potential_winning": "750000.00",
    "winning_status": true,
    "actual_winning": "1500000.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": 141,
    "matched_prize_levels": [
      "Quảng Trị: eighth_prize",
      "Quảng Trị: special_prize"
    ],
    "matched_numbers": ["14", "03"],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "200000"
  },
  {
    "id": "91791926-cf55-4e0b-b64c-5e2c8cd76b16",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.673+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "mb\n03.23.45dd10",
    "formatted_text": "mb\n03.23.45dd10",
    "station_id": null,
    "station_data": {
      "id": null,
      "name": "Miền Bắc",
      "region": "north",
      "multiStation": false,
      "isVirtualStation": true
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["03", "23", "45"],
    "amount": "10000.00",
    "stake": "120000.00",
    "potential_winning": "750000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "150000"
  },
  {
    "id": "0b902176-9504-4240-aa5c-240a1681e304",
    "user_id": "57b88452-566e-405b-8557-6dd389e8625b",
    "admin_id": "947838ac-f576-4d13-9783-465aa09848aa",
    "status": "processed",
    "created_at": "2025-04-18 14:12:22.714+00",
    "processed_at": "2025-04-18 14:13:47.605+00",
    "verified_at": "2025-04-18 14:14:47.616+00",
    "original_text": "tpho\n02.04.33dd10",
    "formatted_text": "tpho\n02.04.33dd10",
    "station_id": 1,
    "station_data": {
      "name": "TP. HCM",
      "region": "south",
      "multiStation": false
    },
    "draw_date": "2025-04-17",
    "bet_type_id": 1,
    "bet_type_alias": "dd",
    "numbers": ["02", "04", "33"],
    "amount": "10000.00",
    "stake": "48000.00",
    "potential_winning": "750000.00",
    "winning_status": false,
    "actual_winning": "0.00",
    "reconciliation_id": null,
    "reconciliation_status": "matched",
    "verified_by": "947838ac-f576-4d13-9783-465aa09848aa",
    "lottery_result_id": null,
    "matched_prize_levels": [],
    "matched_numbers": [],
    "result_verified_at": "2025-04-18 14:14:47.616+00",
    "bet_type_name": "Đầu Đuôi",
    "original_stake": "60000"
  }
]
```
