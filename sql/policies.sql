-- Clear tất cả các policies hiện có
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT
            schemaname,
            tablename,
            policyname
        FROM
            pg_policies
        WHERE
            schemaname = 'public'
    ) LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Bật RLS cho tất cả các bảng
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_station_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bet_type_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_commission_settings ENABLE ROW LEVEL SECURITY;

-- Tạo các helper function để kiểm tra vai trò
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo function để kiểm tra xem admin có quản lý user này hay không
CREATE OR REPLACE FUNCTION public.is_user_manager(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_manager BOOLEAN;
BEGIN
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Kiểm tra xem người dùng hiện tại có phải là người tạo user_id không
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND created_by = auth.uid()
    ) INTO is_manager;
    
    RETURN is_manager;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------
-- Policies cho Roles
--------------------------
-- Super admin có thể làm mọi thứ
CREATE POLICY "super_admin_all_roles" ON roles
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin và User chỉ có thể xem
CREATE POLICY "all_users_can_view_roles" ON roles
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Users
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_users" ON users
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể quản lý người dùng do họ tạo ra
CREATE POLICY "admin_manage_created_users" ON users
    USING (public.is_admin() AND (created_by = auth.uid() OR id = auth.uid()))
    WITH CHECK (public.is_admin() AND (created_by = auth.uid()));

-- Mọi người dùng chỉ có thể xem thông tin của chính mình
CREATE POLICY "users_view_self" ON users
    FOR SELECT
    USING (id = auth.uid());

--------------------------
-- Policies cho Admin Settings
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_admin_settings" ON admin_settings
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin chỉ có thể xem và cập nhật cài đặt của chính mình
CREATE POLICY "admin_manage_own_settings" ON admin_settings
    USING (public.is_admin() AND admin_id = auth.uid())
    WITH CHECK (public.is_admin() AND admin_id = auth.uid());

--------------------------
-- Policies cho Regions
--------------------------
-- Super admin và Admin có toàn quyền
CREATE POLICY "admin_manage_regions" ON regions
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_regions" ON regions
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Stations
--------------------------
-- Super admin và Admin có toàn quyền
CREATE POLICY "admin_manage_stations" ON stations
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_stations" ON stations
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Station Schedules
--------------------------
-- Super admin và Admin có toàn quyền
CREATE POLICY "admin_manage_station_schedules" ON station_schedules
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_station_schedules" ON station_schedules
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Bet Types
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_bet_types" ON bet_types
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có quyền cập nhật một số trường
CREATE POLICY "admin_update_limited_bet_types" ON bet_types
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_bet_types" ON bet_types
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Number Combinations
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_number_combinations" ON number_combinations
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có quyền cập nhật một số trường
CREATE POLICY "admin_update_limited_number_combinations" ON number_combinations
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_number_combinations" ON number_combinations
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho bet_entries
--------------------------
-- Bật RLS cho bảng bet_entries
ALTER TABLE bet_entries ENABLE ROW LEVEL SECURITY;

-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_bet_entries" ON bet_entries
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể xem và quản lý cược của người dùng họ quản lý
CREATE POLICY "admin_manage_user_bet_entries" ON bet_entries
    USING (public.is_admin() AND public.is_user_manager(user_id))
    WITH CHECK (public.is_admin() AND public.is_user_manager(user_id));

-- Admin có thể cập nhật trạng thái và thông tin xác minh cho cược của người dùng họ quản lý
CREATE POLICY "admin_update_bet_entries_status" ON bet_entries
    FOR UPDATE
    USING (public.is_admin() AND public.is_user_manager(user_id))
    WITH CHECK (public.is_admin() AND public.is_user_manager(user_id));

-- Người dùng có thể xem cược của chính mình
CREATE POLICY "users_view_own_bet_entries" ON bet_entries
    FOR SELECT
    USING (user_id = auth.uid());

-- Người dùng có thể tạo cược mới
CREATE POLICY "users_create_bet_entries" ON bet_entries
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND 
        status = 'draft'
    );

-- Người dùng có thể cập nhật cược ở trạng thái 'draft' của chính mình
CREATE POLICY "users_update_own_draft_bet_entries" ON bet_entries
    FOR UPDATE
    USING (
        user_id = auth.uid() AND 
        status = 'draft'
    )
    WITH CHECK (
        user_id = auth.uid() AND 
        status = 'draft'
    );

-- Người dùng có thể xóa cược ở trạng thái 'draft' của chính mình
CREATE POLICY "users_delete_own_draft_bet_entries" ON bet_entries
    FOR DELETE
    USING (
        user_id = auth.uid() AND 
        status = 'draft'
    );
--------------------------
-- Policies cho Lottery Results
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_lottery_results" ON lottery_results
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể thêm và cập nhật kết quả xổ số
CREATE POLICY "admin_manage_lottery_results" ON lottery_results
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Tất cả người dùng có thể xem
CREATE POLICY "all_users_view_lottery_results" ON lottery_results
    FOR SELECT
    USING (true);

--------------------------
-- Policies cho Verifications
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_verifications" ON verifications
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin chỉ có thể xem và tạo đối soát của chính mình
CREATE POLICY "admin_manage_own_verifications" ON verifications
    USING (public.is_admin() AND admin_id = auth.uid())
    WITH CHECK (public.is_admin() AND admin_id = auth.uid());

--------------------------
-- Policies cho User Station Access
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_user_station_access" ON user_station_access
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể quản lý quyền truy cập đài cho người dùng họ quản lý
CREATE POLICY "admin_manage_user_station_access" ON user_station_access
    USING (public.is_admin() AND public.is_user_manager(user_id))
    WITH CHECK (public.is_admin() AND public.is_user_manager(user_id));

-- User chỉ có thể xem quyền truy cập đài của chính mình
CREATE POLICY "users_view_own_station_access" ON user_station_access
    FOR SELECT
    USING (user_id = auth.uid());

--------------------------
-- Policies cho User Bet Type Settings
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_user_bet_type_settings" ON user_bet_type_settings
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể quản lý cài đặt loại cược cho người dùng họ quản lý
CREATE POLICY "admin_manage_user_bet_type_settings" ON user_bet_type_settings
    USING (public.is_admin() AND public.is_user_manager(user_id))
    WITH CHECK (public.is_admin() AND public.is_user_manager(user_id));

-- User chỉ có thể xem cài đặt loại cược của chính mình
CREATE POLICY "users_view_own_bet_type_settings" ON user_bet_type_settings
    FOR SELECT
    USING (user_id = auth.uid());

--------------------------
-- Policies cho User Commission Settings
--------------------------
-- Super admin có toàn quyền
CREATE POLICY "super_admin_all_user_commission_settings" ON user_commission_settings
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin có thể quản lý cài đặt hoa hồng cho người dùng họ quản lý
CREATE POLICY "admin_manage_user_commission_settings" ON user_commission_settings
    USING (public.is_admin() AND public.is_user_manager(user_id))
    WITH CHECK (public.is_admin() AND public.is_user_manager(user_id));

-- User chỉ có thể xem cài đặt hoa hồng của chính mình
CREATE POLICY "users_view_own_commission_settings" ON user_commission_settings
    FOR SELECT
    USING (user_id = auth.uid());