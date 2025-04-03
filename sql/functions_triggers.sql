-- functions_triggers.sql - Functions và Triggers cho hệ thống quản lý cược xổ số

-- Function cập nhật updated_at tự động
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger tự động cập nhật timestamp updated_at cho tất cả bảng
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'spatial_ref_sys'  -- loại bỏ bảng đặc biệt nếu có
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        ', t.table_name);
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- Function kiểm tra giới hạn số lượng user của Admin
CREATE OR REPLACE FUNCTION check_admin_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_users INTEGER;
  current_count INTEGER;
  admin_role_id INTEGER;
BEGIN
  -- Lấy role_id của admin
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Kiểm tra nếu người tạo là admin
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.created_by AND role_id = admin_role_id
  ) THEN
    -- Lấy giới hạn tối đa số lượng user của admin
    SELECT a.max_users INTO max_users
    FROM admin_settings a
    WHERE a.admin_id = NEW.created_by;
    
    -- Đếm số lượng user hiện tại của admin
    SELECT COUNT(*) INTO current_count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.created_by = NEW.created_by
      AND r.name = 'user'
      AND u.is_active = TRUE;
    
    -- Kiểm tra nếu vượt quá giới hạn
    IF current_count >= max_users THEN
      RAISE EXCEPTION 'Admin đã đạt giới hạn số lượng user tối đa: %', max_users;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger kiểm tra giới hạn user
CREATE TRIGGER check_user_limit
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION check_admin_user_limit();

-- Function tự động tạo admin_settings khi tạo admin
CREATE OR REPLACE FUNCTION create_admin_settings()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id INTEGER;
BEGIN
  -- Lấy role_id của admin
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Kiểm tra nếu người dùng mới là admin
  IF NEW.role_id = admin_role_id THEN
    -- Tạo cài đặt mặc định cho admin
    INSERT INTO admin_settings (admin_id, max_users, bet_multiplier, commission_rate)
    VALUES (NEW.id, 5, 0.8, 4.0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger tự động tạo admin_settings
CREATE TRIGGER new_admin_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_admin_settings();

-- Function tự động tạo user_global_settings khi tạo user
CREATE OR REPLACE FUNCTION create_user_global_settings()
RETURNS TRIGGER AS $$
DECLARE
  user_role_id INTEGER;
  admin_bet_multiplier NUMERIC(10, 2);
  admin_commission_rate NUMERIC(5, 2);
BEGIN
  -- Lấy role_id của user
  SELECT id INTO user_role_id FROM roles WHERE name = 'user';
  
  -- Kiểm tra nếu người dùng mới là user thông thường và có admin tạo
  IF NEW.role_id = user_role_id AND NEW.created_by IS NOT NULL THEN
    -- Lấy cài đặt mặc định từ admin
    SELECT bet_multiplier, commission_rate 
    INTO admin_bet_multiplier, admin_commission_rate
    FROM admin_settings
    WHERE admin_id = NEW.created_by;
    
    -- Tạo cài đặt global cho user với các giá trị mặc định từ admin
    INSERT INTO user_global_settings (
      user_id, 
      admin_id, 
      bet_multiplier, 
      commission_rate
    )
    VALUES (
      NEW.id, 
      NEW.created_by, 
      admin_bet_multiplier, 
      admin_commission_rate
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger tự động tạo user_global_settings
CREATE TRIGGER new_user_global_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_global_settings();

-- Function tự động tạo admin_station_settings cho admin mới
CREATE OR REPLACE FUNCTION create_admin_station_settings()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id INTEGER;
  station_rec RECORD;
BEGIN
  -- Lấy role_id của admin
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Kiểm tra nếu người dùng mới là admin
  IF NEW.role_id = admin_role_id THEN
    -- Tạo cài đặt đài mặc định cho tất cả đài đang hoạt động
    FOR station_rec IN SELECT id FROM stations WHERE is_active = TRUE LOOP
      INSERT INTO admin_station_settings (
        admin_id,
        station_id,
        multiplier,
        is_enabled_for_users
      )
      VALUES (
        NEW.id,
        station_rec.id,
        0.8,
        TRUE
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger tự động tạo admin_station_settings
CREATE TRIGGER new_admin_station_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_admin_station_settings();

-- Function tự động tạo admin_bet_type_settings cho admin mới
CREATE OR REPLACE FUNCTION create_admin_bet_type_settings()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id INTEGER;
  bet_type_rec RECORD;
BEGIN
  -- Lấy role_id của admin
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Kiểm tra nếu người dùng mới là admin
  IF NEW.role_id = admin_role_id THEN
    -- Tạo cài đặt loại cược mặc định cho tất cả loại cược đang hoạt động
    FOR bet_type_rec IN SELECT id, payout_rate FROM bet_types WHERE is_active = TRUE LOOP
      INSERT INTO admin_bet_type_settings (
        admin_id,
        bet_type_id,
        payout_rate,
        is_enabled_for_users
      )
      VALUES (
        NEW.id,
        bet_type_rec.id,
        bet_type_rec.payout_rate,
        TRUE
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger tự động tạo admin_bet_type_settings
CREATE TRIGGER new_admin_bet_type_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_admin_bet_type_settings();

-- Function cập nhật cài đặt của user khi cài đặt admin thay đổi
CREATE OR REPLACE FUNCTION update_user_settings_on_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ áp dụng cho các user không có cài đặt riêng
  UPDATE user_global_settings
  SET 
    bet_multiplier = CASE 
      WHEN bet_multiplier IS NULL THEN NEW.bet_multiplier 
      ELSE bet_multiplier 
    END,
    commission_rate = CASE 
      WHEN commission_rate IS NULL THEN NEW.commission_rate 
      ELSE commission_rate 
    END
  WHERE 
    admin_id = NEW.admin_id AND
    (bet_multiplier IS NULL OR commission_rate IS NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cập nhật user settings khi admin settings thay đổi
CREATE TRIGGER update_user_settings
AFTER UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_on_admin_change();