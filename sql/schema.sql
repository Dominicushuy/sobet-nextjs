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
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng AdminSettings (Cài đặt cho Admin)
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  max_users INTEGER NOT NULL DEFAULT 10,
  bet_multiplier NUMERIC(10, 2) NOT NULL DEFAULT 0.8,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.0,
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

-- Enum cho trạng thái mã cược
CREATE TYPE bet_code_status AS ENUM ('draft', 'confirmed', 'processed', 'deleted');

-- Bảng BetCodes (Mã cược)
CREATE TABLE bet_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  status bet_code_status NOT NULL DEFAULT 'draft',
  original_text TEXT NOT NULL,
  formatted_text TEXT,
  station_data JSONB NOT NULL,
  bet_data JSONB NOT NULL,
  stake_amount NUMERIC(12, 2) NOT NULL, -- Tiền đóng
  potential_winning NUMERIC(12, 2) NOT NULL, -- Tiềm năng thắng
  actual_winning NUMERIC(12, 2), -- Tiền thắng thực tế
  is_winning BOOLEAN,
  verified_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng BetCodeLines (Chi tiết dòng cược)
CREATE TABLE bet_code_lines (
  id SERIAL PRIMARY KEY,
  bet_code_id UUID NOT NULL REFERENCES bet_codes(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  original_line TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  numbers TEXT[] NOT NULL,
  bet_type_id INTEGER REFERENCES bet_types(id),
  bet_type_alias VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  stake NUMERIC(10, 2) NOT NULL, -- Calculated stake
  potential_prize NUMERIC(12, 2) NOT NULL, -- Potential winning
  is_permutation BOOLEAN NOT NULL DEFAULT FALSE,
  permutations JSONB,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bet_code_id, line_number)
);

-- Bảng LotteryResults (Kết quả xổ số)
CREATE TABLE lottery_results (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id),
  draw_date DATE NOT NULL,
  result_data JSONB NOT NULL, -- Prize data organized by prize types
  source VARCHAR(255), -- Source of data (API, manual input, etc.)
  created_by UUID REFERENCES users(id),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, draw_date)
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

-- Bảng AdminBetTypeSettings (Cài đặt tỉ lệ trả thưởng)
CREATE TABLE admin_bet_type_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  user_id UUID REFERENCES users(id),
  bet_type_id INTEGER NOT NULL REFERENCES bet_types(id),
  payout_rate JSONB NOT NULL,
  is_enabled_for_users BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, bet_type_id, user_id) -- Thêm user_id vào constraint
);

-- Bảng AdminStationSettings (Cài đặt hệ số nhân cho từng đài)
CREATE TABLE admin_station_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  station_id INTEGER NOT NULL REFERENCES stations(id),
  user_id UUID REFERENCES users(id),
  multiplier NUMERIC(10, 2) NOT NULL DEFAULT 0.8,
  is_enabled_for_users BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, station_id, user_id) -- Thêm user_id vào constraint
);

-- Bảng UserGlobalSettings (Cài đặt chung cho User)
CREATE TABLE user_global_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  user_id UUID NOT NULL REFERENCES users(id),
  bet_multiplier NUMERIC(10, 2),
  commission_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, user_id)
);