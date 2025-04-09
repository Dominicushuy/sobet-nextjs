Tôi định xây dựng portal để quản lý các lượt đặt cược xổ số. Mô hình kinh doanh
và chức năng chính của hệ thống như sau:

- Hệ thống bao gồm 3 roles: Super Admin, Admin, User.
- Ban đầu Super Admin sẽ tạo tài khoản Admin và cài đặt số lượng User tối đa mà
  Admin được phép tạo.
- Admin sẽ tạo tài khoản User và chỉ được tạo tối đa số lượng User mà Super
  Admin đã cài đặt.
- User sẽ đăng nhập vào hệ thống và tạo mã cược.
- Danh sách tỉnh thành phố và danh sách các loại cược xổ số sẽ được hệ thống
  thêm vào mặc định trước, tham khảo file dưới đây

## Super Admin

- Đăng nhập vào hệ thống
- Toàn quyền quản lý hệ thống
  - Quản lý tất cả các Admin (Thêm, sửa, xóa, khóa hoạt động tài khoản)
  - Quản lý tất cả các User (Thêm, sửa, xóa, khóa hoạt động tài khoản)
  - Quản lý tất cả các loại cược xổ số (Thêm, sửa, xóa, khóa hoạt động)
  - Quản lý tất cả các đài xổ số tỉnh, thành phố (khóa hoạt động)
  - Quản lý tất cả các loại cược xổ số (khóa hoạt động)

## Admin

- Đăng nhập vào hệ thống
- Quản lý tất cả các User:
  - Thêm , xóa , sửa thông tin tài khoản
  - Thay đổi mật khẩu
  - Khóa hoạt động tài khoản
  - Cài đặt lại mật khẩu
  - Cài đặt cấu hình thông số tỉ lệ trả thưởng của mỗi loại cược xổ số
  - Cài đặt hệ số nhân của mỗi đài xổ số
- Quản lý tất cả các loại cược xổ số (Kích hoạt, khóa hoạt động)
- Quản lý tất cả các đài xổ số (tỉnh, thành phố - Kích hoạt, khóa hoạt động)
- Quản lý tất cả lượt đặt cược trong ngày

  - Duyệt
  - Xóa

- Quản lý kết quả xổ số
- Màn hình đối soát kết quả xổ số từ bên thứ 3
- Quản lý lịch sử mã cược
- Màn hình nhập mã cược

## User

- Đăng nhập vào hệ thống
- Thay đổi mật khẩu
- Màn hình tạo mã cược
- Màn hình lịch sử mã đã tạo

Dựa vào những thông tin trên và tài liệu tham khảo dưới đây. Hãy giúp tôi thiết
kế SQL Query của toàn bộ dự án, cấu hình cơ sở dữ liệu, các bảng, các trường
trong bảng, các kiểu dữ liệu của từng trường trong bảng, các ràng buộc giữa các
bảng với nhau, Policies RLS, Triggers, Functions,...
