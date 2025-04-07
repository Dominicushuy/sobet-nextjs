-- sql/functions_triggers.sql
-- Các functions và triggers bổ sung cho hệ thống

-- Hàm tự động tạo quyền truy cập đài cho người dùng mới
CREATE OR REPLACE FUNCTION create_default_user_station_access()
RETURNS TRIGGER AS $$
DECLARE
    station_record RECORD;
BEGIN
    -- Nếu là người dùng thường (role_id = 3), tạo quyền truy cập mặc định
    IF NEW.role_id = 3 THEN
        -- Tự động thêm quyền truy cập cho tất cả các đài đang hoạt động
        FOR station_record IN (SELECT id FROM stations WHERE is_active = TRUE) LOOP
            INSERT INTO user_station_access (
                user_id, 
                station_id, 
                is_enabled, 
                created_by
            ) 
            VALUES (
                NEW.id, 
                station_record.id, 
                TRUE, 
                NEW.created_by
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động tạo quyền truy cập đài mặc định cho người dùng mới
CREATE TRIGGER trigger_create_default_user_station_access
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_user_station_access();

-- Trigger function để cập nhật trường updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo triggers update_timestamp cho tất cả các bảng có trường updated_at
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT 
            table_name 
        FROM 
            information_schema.columns 
        WHERE 
            table_schema = 'public' AND 
            column_name = 'updated_at'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trigger_update_timestamp
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp()',
            t.table_name
        );
    END LOOP;
END
$$ LANGUAGE plpgsql;