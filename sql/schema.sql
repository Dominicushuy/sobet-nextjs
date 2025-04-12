-- schema.sql - Tạo cấu trúc cơ sở dữ liệu cho hệ thống quản lý cược xổ số

-- Extension cho UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng Roles (Vai trò người dùng)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Users (Người dùng)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(100),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng AdminSettings (Cài đặt cho Admin)
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  max_users INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id)
);

-- Bảng Regions (Miền)
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Stations (Đài xổ số)
CREATE TABLE stations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  aliases TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng StationSchedules (Lịch xổ số)
CREATE TABLE station_schedules (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id),
  day_of_week VARCHAR(20) NOT NULL, -- 'monday', 'tuesday', 'daily', etc.
  order_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, day_of_week, order_number)
);

-- Bảng StationRelationships (Quan hệ đài cha-con)
CREATE TABLE station_relationships (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES stations(id),
  child_id INTEGER NOT NULL REFERENCES stations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, child_id)
);

-- Bảng BetTypes (Loại cược)
CREATE TABLE bet_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  aliases TEXT[] NOT NULL,
  applicable_regions TEXT[] NOT NULL,
  bet_rule TEXT[] NOT NULL,
  matching_method TEXT NOT NULL,
  payout_rate JSONB NOT NULL,
  combinations JSONB NOT NULL,
  is_permutation BOOLEAN NOT NULL DEFAULT FALSE,
  special_calc VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  multiplier NUMERIC NOT NULL DEFAULT 1;
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng NumberCombinations (Các kiểu chọn tổ hợp số)
CREATE TABLE number_combinations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  aliases TEXT[] NOT NULL,
  definition TEXT NOT NULL,
  syntax VARCHAR(255) NOT NULL,
  applicable_bet_types TEXT[] NOT NULL,
  examples TEXT[] NOT NULL,
  calculation_method TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng BetCodes (Mã cược)
-- Enum cho trạng thái mã cược
CREATE TYPE bet_code_status AS ENUM ('draft', 'confirmed', 'processed', 'deleted');
CREATE TYPE bet_reconciliation_status AS ENUM ('pending', 'matched', 'discrepancy', 'adjusted', 'finalized');

CREATE TABLE bet_entries (
  -- Thông tin cơ bản
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- ID duy nhất để nhận diện mỗi lần đặt cược
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Người dùng thực hiện đặt cược
  admin_id UUID REFERENCES auth.users(id), -- Admin xử lý/duyệt cược nếu có
  status bet_code_status NOT NULL DEFAULT 'draft', -- Trạng thái hiện tại của lần đặt cược
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Thời điểm tạo bản ghi
  processed_at TIMESTAMPTZ, -- Thời điểm mã cược được xử lý
  verified_at TIMESTAMPTZ, -- Thời điểm mã cược được xác minh
  
  -- Nội dung mã cược
  original_text TEXT NOT NULL, -- Văn bản gốc của mã cược nhận từ người dùng
  formatted_text TEXT, -- Văn bản mã cược đã được định dạng lại
  station_id INTEGER REFERENCES stations(id), -- ID của đài xổ số
  station_data JSONB NOT NULL, -- Thông tin chi tiết về đài (tên, vùng, v.v.)
  draw_date DATE, -- Ngày quay thưởng dự kiến
  
  -- Thông tin dòng cược
  original_line TEXT NOT NULL, -- Nội dung gốc của dòng cược
  bet_type_id INTEGER REFERENCES bet_types(id), -- ID của loại cược (đầu, đuôi, lô, v.v.)
  bet_type_alias VARCHAR(100) NOT NULL, -- Tên viết tắt của loại cược
  numbers TEXT[] NOT NULL, -- Các số được đặt cược
  
  -- Thông tin tài chính
  amount NUMERIC(12, 2) NOT NULL, -- Số tiền đặt cược từ người dùng
  stake NUMERIC(12, 2) NOT NULL, -- Số tiền đóng thực tế sau khi tính toán
  price_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.8, -- Tỷ lệ giá áp dụng
  potential_winning NUMERIC(12, 2) NOT NULL, -- Tổng số tiền thưởng tiềm năng
  winning_status BOOLEAN, -- Trạng thái trúng thưởng (true/false/null = chưa xác định)
  actual_winning NUMERIC(12, 2), -- Số tiền thưởng thực tế nhận được
  
  -- Xử lý đặc biệt
  calculation_formula TEXT, -- Công thức tính toán đã sử dụng
  
  -- Đối soát và xác minh
  reconciliation_id INTEGER REFERENCES verifications(id) ON DELETE SET NULL, -- ID của bản ghi đối soát
  reconciliation_status bet_reconciliation_status DEFAULT 'pending', -- Trạng thái đối soát
  verified_by UUID REFERENCES auth.users(id), -- Người xác minh

  -- Thêm các cột liên kết với bảng lottery_results
  lottery_result_id INTEGER REFERENCES lottery_results(id), -- ID tham chiếu đến kết quả xổ số
  matched_prize_levels TEXT[], -- Các loại giải thưởng đã trúng, ví dụ: ['special_prize', 'first_prize']
  matched_number TEXT, -- Số trúng thưởng chính
  matched_numbers TEXT[], -- Tất cả các số trúng (cho trường hợp đá, đảo,...)
  prize_category VARCHAR(50), -- Loại giải thưởng (đầu, đuôi, lô, 3 càng,...)
  prize_position INTEGER, -- Vị trí trúng giải (nếu có nhiều vị trí)
  result_verified_at TIMESTAMPTZ, -- Thời điểm xác minh kết quả
  result_verified_by UUID REFERENCES auth.users(id), -- Người xác minh kết quả
  result_details JSONB, -- Chi tiết bổ sung về kết quả khớp
  
  -- Ràng buộc duy nhất
  UNIQUE (bet_type_id, line_number)
);

-- Bảng LotteryResults (Kết quả xổ số)
CREATE TABLE lottery_results (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id),
  draw_date DATE NOT NULL,                    -- Ngày quay số
  day_of_week VARCHAR(20) NOT NULL,           -- Thứ trong tuần
  special_prize TEXT[] NOT NULL,              -- Giải đặc biệt
  first_prize TEXT[] NOT NULL,                -- Giải nhất
  second_prize TEXT[] NOT NULL,               -- Giải nhì
  third_prize TEXT[] NOT NULL,                -- Giải ba
  fourth_prize TEXT[] NOT NULL,               -- Giải tư
  fifth_prize TEXT[] NOT NULL,                -- Giải năm
  sixth_prize TEXT[] NOT NULL,                -- Giải sáu
  seventh_prize TEXT[] NOT NULL,              -- Giải bảy
  eighth_prize TEXT[],                        -- Giải tám (chỉ có ở Miền Nam và Miền Trung)
  source VARCHAR(255),                        -- Nguồn dữ liệu
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_id, draw_date)
);

-- Bảng Verifications (Đối soát)
CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id),
  verification_data JSONB NOT NULL,
  total_bet_codes INTEGER NOT NULL,
  total_stake_amount NUMERIC(12, 2) NOT NULL,
  total_winning_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, admin_id)
);

-- Bảng quản lý quyền truy cập đài xổ số của người dùng
CREATE TABLE user_station_access (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id), -- Admin đã thiết lập quyền này
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, station_id)
);

-- Bảng user_bet_type_settings - Cài đặt loại cược cho từng người dùng
CREATE TABLE user_bet_type_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet_type_id INTEGER NOT NULL REFERENCES bet_types(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  payout_rate JSONB, -- NULL = sử dụng tỷ lệ mặc định, NOT NULL = sử dụng tỷ lệ tùy chỉnh
  created_by UUID NOT NULL REFERENCES users(id), -- Admin đã thiết lập cài đặt này
  multiplier NUMERIC NOT NULL DEFAULT 1;
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bet_type_id)
);

-- Add new table for user commission settings
CREATE TABLE user_commission_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_rate NUMERIC NOT NULL DEFAULT 0.8, -- Tỉ lệ nhân cho khách
  export_price_rate NUMERIC NOT NULL DEFAULT 0.74, -- Tỉ lệ nhân khi thu
  return_price_rate NUMERIC NOT NULL DEFAULT 0.95, -- Tỉ lệ hồi khi thu
  created_by UUID NOT NULL REFERENCES users(id), -- Admin đã thiết lập cài đặt này
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);