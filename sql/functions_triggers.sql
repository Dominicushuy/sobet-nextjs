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
    INSERT INTO admin_settings (admin_id, max_users, bet_multiplier)
    VALUES (NEW.id, 10, 0.8);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger tự động tạo admin_settings
CREATE TRIGGER new_admin_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_admin_settings();

-- Function tính toán kết quả trúng thưởng
CREATE OR REPLACE FUNCTION verify_bet_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Cập nhật bet_codes khi có kết quả xổ số được xác nhận
  UPDATE bet_codes
  SET 
    is_winning = (
      -- Logic phức tạp để xác định xem mã cược có trúng hay không
      -- Đây chỉ là ví dụ đơn giản
      CASE WHEN EXISTS (
        -- Logic kiểm tra trúng thưởng sẽ đặt ở đây
        -- Ví dụ: Kiểm tra số cược trong bet_data có khớp với các số trong result_data
        SELECT 1
      ) THEN TRUE ELSE FALSE END
    ),
    actual_winning = (
      -- Logic tính toán số tiền thực tế trúng thưởng
      -- Đây chỉ là ví dụ đơn giản
      CASE WHEN EXISTS (
        -- Logic kiểm tra trúng thưởng
        SELECT 1
      ) THEN potential_winning ELSE 0 END
    ),
    verified_at = NOW()
  WHERE 
    -- Tìm các mã cược phù hợp với kết quả này
    status = 'confirmed'
    AND (station_data->>'id')::INTEGER = NEW.station_id
    AND DATE(created_at) = NEW.draw_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger xác minh mã cược
CREATE TRIGGER verify_bet_codes_on_result
AFTER UPDATE ON lottery_results
FOR EACH ROW
WHEN (NEW.verified = TRUE AND OLD.verified = FALSE)
EXECUTE FUNCTION verify_bet_codes();