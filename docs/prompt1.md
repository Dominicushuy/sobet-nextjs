Nâng cấp logic `reconcileBets` trong `src/app/actions/bet-reconciliation.js` một
số mã `bets` có `station_id` bằng `null` nhưng trong `station_data` có dữ liệu.
Trường hợp `null` này cần lấy dữ liệu thêm của bảng `station_schedules` để đối
soát, dựa vào cột `order_number` để lấy số đài. Ví dụ `2dmn` có `station_data`:

```
{
  "name": "Miền Nam",
  "count": 2,
  "region": "south",
  "multiStation": true
}
```

Thì lấy `order_number` là 1, 2 của đài miền nam xổ trong hôm nay để đối soát.

Ví dụ dữ liệu của bảng `bet_entries`

[ { "formatted_text": "2dmn\n01.02b1", "station_id": null, "station_data": {
"name": "Miền Nam", "count": 2, "region": "south", "multiStation": true } }, {
"formatted_text": "2dmn\n01.02dd1", "station_id": null, "station_data": {
"name": "Miền Nam", "count": 2, "region": "south", "multiStation": true } }, {
"formatted_text": "vt\n123.446xc1", "station_id": 5, "station_data": { "name":
"Vũng Tàu", "region": "south", "multiStation": false } }, { "formatted_text":
"2dmn\n123.456xcdao10", "station_id": null, "station_data": { "name": "Miền
Nam", "count": 2, "region": "south", "multiStation": true } }, {
"formatted_text": "2dmn\n28b5", "station_id": null, "station_data": { "name":
"Miền Nam", "count": 2, "region": "south", "multiStation": true } }, {
"formatted_text": "mb\n73dd15", "station_id": 36, "station_data": { "name":
"Miền Bắc", "region": "north", "multiStation": false } }, { "formatted_text":
"2dmt\n01bdao1", "station_id": null, "station_data": { "name": "Miền Trung",
"count": 2, "region": "central", "multiStation": true } }, { "formatted_text":
"3dmn\n25.42da1", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 3, "region": "south", "multiStation": true } }, { "formatted_text":
"2dmn\n10/11keo19dd9", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"2dmt\n07.08dd1", "station_id": null, "station_data": { "name": "Miền Trung",
"count": 2, "region": "central", "multiStation": true } }, { "formatted_text":
"2dmn\n24dd45", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"2dmn\n705xcdui12", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"2dmn\n55dd20", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"mb\n36.03.27.28da0.5", "station_id": 36, "station_data": { "name": "Miền Bắc",
"region": "north", "multiStation": false } }, { "formatted_text":
"2dmn\n707xc3", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"2dmn\n52.19dd11", "station_id": null, "station_data": { "name": "Miền Nam",
"count": 2, "region": "south", "multiStation": true } }, { "formatted_text":
"mb\n07.70.24.42da0.5", "station_id": 36, "station_data": { "name": "Miền Bắc",
"region": "north", "multiStation": false } }, { "formatted_text":
"2dmn\n123.932.446.771xc1", "station_id": null, "station_data": { "name": "Miền
Nam", "count": 2, "region": "south", "multiStation": true } } ] ==== Bảng
`station_schedules`: [ { "station_id": 1, "day_of_week": "monday",
"order_number": 1 }, { "station_id": 1, "day_of_week": "saturday",
"order_number": 1 }, { "station_id": 2, "day_of_week": "monday", "order_number":
2 }, { "station_id": 3, "day_of_week": "monday", "order_number": 3 }, {
"station_id": 4, "day_of_week": "tuesday", "order_number": 1 }, { "station_id":
5, "day_of_week": "tuesday", "order_number": 2 }, { "station_id": 6,
"day_of_week": "tuesday", "order_number": 3 }, { "station_id": 7, "day_of_week":
"wednesday", "order_number": 1 }, { "station_id": 8, "day_of_week": "wednesday",
"order_number": 2 }, { "station_id": 9, "day_of_week": "wednesday",
"order_number": 3 }, { "station_id": 10, "day_of_week": "thursday",
"order_number": 1 }, { "station_id": 11, "day_of_week": "thursday",
"order_number": 2 }, { "station_id": 12, "day_of_week": "thursday",
"order_number": 3 }, { "station_id": 13, "day_of_week": "friday",
"order_number": 1 }, { "station_id": 14, "day_of_week": "friday",
"order_number": 2 }, { "station_id": 15, "day_of_week": "friday",
"order_number": 3 }, { "station_id": 16, "day_of_week": "saturday",
"order_number": 2 }, { "station_id": 17, "day_of_week": "saturday",
"order_number": 3 }, { "station_id": 18, "day_of_week": "saturday",
"order_number": 4 }, { "station_id": 19, "day_of_week": "sunday",
"order_number": 1 }, { "station_id": 20, "day_of_week": "sunday",
"order_number": 2 }, { "station_id": 21, "day_of_week": "sunday",
"order_number": 3 }, { "station_id": 22, "day_of_week": "wednesday",
"order_number": 1 }, { "station_id": 22, "day_of_week": "saturday",
"order_number": 1 }, { "station_id": 23, "day_of_week": "tuesday",
"order_number": 2 }, { "station_id": 24, "day_of_week": "tuesday",
"order_number": 1 }, { "station_id": 25, "day_of_week": "wednesday",
"order_number": 2 }, { "station_id": 25, "day_of_week": "sunday",
"order_number": 2 }, { "station_id": 26, "day_of_week": "monday",
"order_number": 2 }, { "station_id": 26, "day_of_week": "sunday",
"order_number": 3 }, { "station_id": 27, "day_of_week": "monday",
"order_number": 1 }, { "station_id": 28, "day_of_week": "thursday",
"order_number": 1 }, { "station_id": 29, "day_of_week": "thursday",
"order_number": 2 }, { "station_id": 30, "day_of_week": "thursday",
"order_number": 3 }, { "station_id": 31, "day_of_week": "friday",
"order_number": 1 }, { "station_id": 32, "day_of_week": "friday",
"order_number": 2 }, { "station_id": 33, "day_of_week": "saturday",
"order_number": 2 }, { "station_id": 34, "day_of_week": "saturday",
"order_number": 3 }, { "station_id": 35, "day_of_week": "sunday",
"order_number": 1 }, { "station_id": 36, "day_of_week": "daily", "order_number":
1 } ]
