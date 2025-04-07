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
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        ', t.table_name, t.table_name);
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- Function kiểm tra quyền Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR;
BEGIN
    SELECT r.name INTO v_role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id;
    
    RETURN v_role_name = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function kiểm tra quyền Admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR;
BEGIN
    SELECT r.name INTO v_role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id;
    
    RETURN v_role_name = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function kiểm tra quyền Regular User
CREATE OR REPLACE FUNCTION is_regular_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR;
BEGIN
    SELECT r.name INTO v_role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id;
    
    RETURN v_role_name = 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function tự động tạo admin_station_settings cho Admin mới
CREATE OR REPLACE FUNCTION create_default_admin_station_settings()
RETURNS TRIGGER AS $$
DECLARE
    station_rec RECORD;
BEGIN
    -- Chỉ áp dụng cho Admin mới
    IF NOT is_admin(NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Tạo cài đặt mặc định cho tất cả đài đang hoạt động
    FOR station_rec IN (SELECT id FROM stations WHERE is_active = TRUE) LOOP
        INSERT INTO admin_station_settings 
            (admin_id, station_id, is_enabled_for_users, created_at, updated_at)
        VALUES
            (NEW.id, station_rec.id, TRUE, NOW(), NOW());
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động tạo admin_station_settings khi thêm Admin mới
DROP TRIGGER IF EXISTS create_admin_station_settings ON users;
CREATE TRIGGER create_admin_station_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_admin_station_settings();

-- Function tự động tạo admin_bet_type_settings cho Admin mới
CREATE OR REPLACE FUNCTION create_default_admin_bet_type_settings()
RETURNS TRIGGER AS $$
DECLARE
    bet_type_rec RECORD;
BEGIN
    -- Chỉ áp dụng cho Admin mới
    IF NOT is_admin(NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Tạo cài đặt mặc định cho tất cả loại cược đang hoạt động
    FOR bet_type_rec IN (SELECT id FROM bet_types WHERE is_active = TRUE) LOOP
        INSERT INTO admin_bet_type_settings 
            (admin_id, bet_type_id, payout_rate, is_enabled_for_users, created_at, updated_at)
        VALUES
            (NEW.id, bet_type_rec.id, '{}', TRUE, NOW(), NOW());
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động tạo admin_bet_type_settings khi thêm Admin mới
DROP TRIGGER IF EXISTS create_admin_bet_type_settings ON users;
CREATE TRIGGER create_admin_bet_type_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_admin_bet_type_settings();

-- Function tự động tạo admin_station_settings khi thêm đài mới
CREATE OR REPLACE FUNCTION create_station_settings_for_admins()
RETURNS TRIGGER AS $$
DECLARE
    admin_rec RECORD;
BEGIN
    -- Chỉ áp dụng khi đài được kích hoạt
    IF NOT NEW.is_active THEN
        RETURN NEW;
    END IF;
    
    -- Tạo cài đặt mặc định cho tất cả Admin
    FOR admin_rec IN (
        SELECT u.id 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name = 'admin'
    ) LOOP
        INSERT INTO admin_station_settings 
            (admin_id, station_id, is_enabled_for_users, created_at, updated_at)
        VALUES
            (admin_rec.id, NEW.id, TRUE, NOW(), NOW());
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động tạo admin_station_settings khi thêm đài mới
DROP TRIGGER IF EXISTS create_station_settings_for_admins ON stations;
CREATE TRIGGER create_station_settings_for_admins
AFTER INSERT ON stations
FOR EACH ROW
EXECUTE FUNCTION create_station_settings_for_admins();

-- Function tự động tạo admin_bet_type_settings khi thêm loại cược mới
CREATE OR REPLACE FUNCTION create_bet_type_settings_for_admins()
RETURNS TRIGGER AS $$
DECLARE
    admin_rec RECORD;
BEGIN
    -- Chỉ áp dụng khi loại cược được kích hoạt
    IF NOT NEW.is_active THEN
        RETURN NEW;
    END IF;
    
    -- Tạo cài đặt mặc định cho tất cả Admin
    FOR admin_rec IN (
        SELECT u.id 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name = 'admin'
    ) LOOP
        INSERT INTO admin_bet_type_settings 
            (admin_id, bet_type_id, payout_rate, is_enabled_for_users, created_at, updated_at)
        VALUES
            (admin_rec.id, NEW.id, '{}', TRUE, NOW(), NOW());
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động tạo admin_bet_type_settings khi thêm loại cược mới
DROP TRIGGER IF EXISTS create_bet_type_settings_for_admins ON bet_types;
CREATE TRIGGER create_bet_type_settings_for_admins
AFTER INSERT ON bet_types
FOR EACH ROW
EXECUTE FUNCTION create_bet_type_settings_for_admins();

-- Function để xử lý khi Super Admin vô hiệu hóa một đài
CREATE OR REPLACE FUNCTION handle_station_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu đài bị vô hiệu hóa từ active -> inactive
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        -- Không cần update admin_station_settings vì logic code sẽ kiểm tra is_active của đài
        -- Admin không thể kích hoạt đài đã bị vô hiệu hóa bởi Super Admin
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để xử lý khi Super Admin vô hiệu hóa một đài
DROP TRIGGER IF EXISTS handle_station_deactivation ON stations;
CREATE TRIGGER handle_station_deactivation
AFTER UPDATE ON stations
FOR EACH ROW
WHEN (OLD.is_active = TRUE AND NEW.is_active = FALSE)
EXECUTE FUNCTION handle_station_deactivation();

-- Function để xử lý khi Super Admin vô hiệu hóa một loại cược
CREATE OR REPLACE FUNCTION handle_bet_type_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu loại cược bị vô hiệu hóa từ active -> inactive
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        -- Không cần update admin_bet_type_settings vì logic code sẽ kiểm tra is_active của loại cược
        -- Admin không thể kích hoạt loại cược đã bị vô hiệu hóa bởi Super Admin
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để xử lý khi Super Admin vô hiệu hóa một loại cược
DROP TRIGGER IF EXISTS handle_bet_type_deactivation ON bet_types;
CREATE TRIGGER handle_bet_type_deactivation
AFTER UPDATE ON bet_types
FOR EACH ROW
WHEN (OLD.is_active = TRUE AND NEW.is_active = FALSE)
EXECUTE FUNCTION handle_bet_type_deactivation();

-- Function để xác thực mã cược khi người dùng đặt cược
CREATE OR REPLACE FUNCTION validate_bet_code()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_station_id INTEGER;
    v_bet_type_id INTEGER;
    v_is_valid BOOLEAN := TRUE;
    v_error_message TEXT := '';
BEGIN
    -- Lấy thông tin từ bet_code
    v_user_id := NEW.user_id;
    
    -- Lấy admin_id từ user
    SELECT created_by INTO v_admin_id
    FROM users
    WHERE id = v_user_id;
    
    -- Kiểm tra từng đài và loại cược trong mã cược
    FOR v_station_id, v_bet_type_id IN 
        SELECT (jsonb_array_elements(NEW.station_data)::jsonb->>'id')::INTEGER, 
               (jsonb_array_elements(NEW.bet_data)::jsonb->>'id')::INTEGER
        FROM unnest(ARRAY[1]) -- Trick để sử dụng jsonb_array_elements trong FOR loop
    LOOP
        -- Kiểm tra đài có active và được phép bởi admin không
        IF NOT EXISTS (
            SELECT 1 
            FROM stations s
            WHERE s.id = v_station_id 
            AND s.is_active = TRUE
            AND EXISTS (
                SELECT 1 
                FROM admin_station_settings ass
                WHERE ass.station_id = s.id
                AND ass.admin_id = v_admin_id
                AND ass.is_enabled_for_users = TRUE
                AND (ass.user_id IS NULL OR ass.user_id = v_user_id)
            )
        ) THEN
            v_is_valid := FALSE;
            v_error_message := v_error_message || 'Đài không hoạt động hoặc không được phép. ';
        END IF;
        
        -- Kiểm tra loại cược có active và được phép bởi admin không
        IF NOT EXISTS (
            SELECT 1 
            FROM bet_types bt
            WHERE bt.id = v_bet_type_id 
            AND bt.is_active = TRUE
            AND EXISTS (
                SELECT 1 
                FROM admin_bet_type_settings abts
                WHERE abts.bet_type_id = bt.id
                AND abts.admin_id = v_admin_id
                AND abts.is_enabled_for_users = TRUE
                AND (abts.user_id IS NULL OR abts.user_id = v_user_id)
            )
        ) THEN
            v_is_valid := FALSE;
            v_error_message := v_error_message || 'Loại cược không hoạt động hoặc không được phép. ';
        END IF;
    END LOOP;
    
    -- Cập nhật trạng thái của mã cược nếu không hợp lệ
    IF NOT v_is_valid THEN
        NEW.status := 'draft'; -- Giữ ở trạng thái nháp nếu không hợp lệ
        -- Trong ứng dụng thực tế, bạn có thể muốn thêm field error_message vào bảng bet_codes
        -- hoặc trả lỗi để client xử lý
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để xác thực mã cược khi người dùng đặt cược
DROP TRIGGER IF EXISTS validate_bet_code ON bet_codes;
CREATE TRIGGER validate_bet_code
BEFORE INSERT OR UPDATE ON bet_codes
FOR EACH ROW
WHEN (NEW.status = 'confirmed') -- Chỉ kiểm tra khi mã cược được xác nhận
EXECUTE FUNCTION validate_bet_code();

-- Tạo helper function để lấy các stations đang active cho một user
CREATE OR REPLACE FUNCTION get_active_stations_for_user(p_user_id UUID)
RETURNS SETOF stations AS $$
DECLARE
    v_created_by UUID;
BEGIN
    -- Get the ID of the admin who created this user
    SELECT created_by INTO v_created_by
    FROM users
    WHERE id = p_user_id;

    -- Return active stations that are enabled for this user by their admin
    RETURN QUERY
    SELECT s.*
    FROM stations s
    WHERE s.is_active = TRUE -- Global active status set by Super Admin
    AND EXISTS (
        SELECT 1
        FROM admin_station_settings ass
        WHERE ass.station_id = s.id
        AND ass.admin_id = v_created_by
        AND ass.is_enabled_for_users = TRUE
        AND (ass.user_id IS NULL OR ass.user_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo helper function để lấy các bet types đang active cho một user
CREATE OR REPLACE FUNCTION get_active_bet_types_for_user(p_user_id UUID)
RETURNS SETOF bet_types AS $$
DECLARE
    v_created_by UUID;
BEGIN
    -- Get the ID of the admin who created this user
    SELECT created_by INTO v_created_by
    FROM users
    WHERE id = p_user_id;

    -- Return active bet types that are enabled for this user by their admin
    RETURN QUERY
    SELECT bt.*
    FROM bet_types bt
    WHERE bt.is_active = TRUE -- Global active status set by Super Admin
    AND EXISTS (
        SELECT 1
        FROM admin_bet_type_settings abts
        WHERE abts.bet_type_id = bt.id
        AND abts.admin_id = v_created_by
        AND abts.is_enabled_for_users = TRUE
        AND (abts.user_id IS NULL OR abts.user_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;