-- policies.sql - Row Level Security (RLS) Policies cho hệ thống quản lý cược xổ số

-- Bật RLS cho tất cả bảng
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'spatial_ref_sys'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t.table_name);
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- Functions kiểm tra vai trò
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id::uuid = u.id
    JOIN public.roles r ON u.role_id = r.id
    WHERE au.id = auth.uid() AND r.name = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id::uuid = u.id
    JOIN public.roles r ON u.role_id = r.id
    WHERE au.id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id::uuid = u.id
    JOIN public.roles r ON u.role_id = r.id
    WHERE au.id = auth.uid() AND r.name IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_regular_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id::uuid = u.id
    JOIN public.roles r ON u.role_id = r.id
    WHERE au.id = auth.uid() AND r.name = 'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies cho bảng Roles
CREATE POLICY "Anyone can view roles"
ON roles
FOR SELECT
USING (true);

CREATE POLICY "Only super admin can modify roles"
ON roles
FOR ALL
USING (auth.is_super_admin());

-- 2. Policies cho bảng Users
CREATE POLICY "Super admin can see all users"
ON users
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can see users they created and themselves"
ON users
FOR SELECT
USING (
  auth.is_admin() AND 
  (created_by = auth.uid() OR id = auth.uid())
);

CREATE POLICY "Regular users can only see themselves"
ON users
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Super admin can insert users"
ON users
FOR INSERT
WITH CHECK (auth.is_super_admin());

CREATE POLICY "Admin can insert users with user role"
ON users
FOR INSERT
WITH CHECK (
  auth.is_admin() AND 
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_id AND r.name = 'user'
  )
);

CREATE POLICY "Super admin can update any user"
ON users
FOR UPDATE
USING (auth.is_super_admin());

CREATE POLICY "Admin can update users they created"
ON users
FOR UPDATE
USING (
  auth.is_admin() AND 
  created_by = auth.uid()
);

CREATE POLICY "Users can update their own non-role information"
ON users
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Super admin can delete users"
ON users
FOR DELETE
USING (auth.is_super_admin());

CREATE POLICY "Admin can delete users they created"
ON users
FOR DELETE
USING (
  auth.is_admin() AND 
  created_by = auth.uid()
);

-- 3. Policies cho bảng AdminSettings
CREATE POLICY "Super admin can view all admin settings"
ON admin_settings
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view their own settings"
ON admin_settings
FOR SELECT
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

CREATE POLICY "Super admin can modify admin settings"
ON admin_settings
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can modify their own settings"
ON admin_settings
FOR UPDATE
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

-- 4. Policies cho bảng Regions
CREATE POLICY "Anyone can view regions"
ON regions
FOR SELECT
USING (true);

CREATE POLICY "Only super admin can modify regions"
ON regions
FOR ALL
USING (auth.is_super_admin());

-- 5. Policies cho bảng Stations
CREATE POLICY "Anyone can view active stations"
ON stations
FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admin or super admin can view all stations"
ON stations
FOR SELECT
USING (auth.is_admin_or_super_admin());

CREATE POLICY "Super admin can modify stations"
ON stations
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can update station activity status"
ON stations
FOR UPDATE
USING (auth.is_admin());

-- 6. Policies cho bảng StationSchedules
CREATE POLICY "Anyone can view station schedules"
ON station_schedules
FOR SELECT
USING (true);

CREATE POLICY "Only super admin can modify station schedules"
ON station_schedules
FOR ALL
USING (auth.is_super_admin());

-- 7. Policies cho bảng StationRelationships
CREATE POLICY "Anyone can view station relationships"
ON station_relationships
FOR SELECT
USING (true);

CREATE POLICY "Only super admin can modify station relationships"
ON station_relationships
FOR ALL
USING (auth.is_super_admin());

-- 8. Policies cho bảng BetTypes
CREATE POLICY "Anyone can view active bet types"
ON bet_types
FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admin or super admin can view all bet types"
ON bet_types
FOR SELECT
USING (auth.is_admin_or_super_admin());

CREATE POLICY "Super admin can modify bet types"
ON bet_types
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can update bet type activity status"
ON bet_types
FOR UPDATE
USING (auth.is_admin());

-- 9. Policies cho bảng BetCodes
CREATE POLICY "Super admin can view all bet codes"
ON bet_codes
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view all bet codes"
ON bet_codes
FOR SELECT
USING (auth.is_admin());

CREATE POLICY "Users can view their own bet codes"
ON bet_codes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bet codes"
ON bet_codes
FOR INSERT
WITH CHECK (
  auth.is_regular_user() AND 
  user_id = auth.uid() AND 
  created_by = auth.uid() AND 
  status = 'draft'
);

CREATE POLICY "Admin can insert bet codes for users"
ON bet_codes
FOR INSERT
WITH CHECK (auth.is_admin());

CREATE POLICY "Super admin can update any bet code"
ON bet_codes
FOR UPDATE
USING (auth.is_super_admin());

CREATE POLICY "Admin can update any bet code"
ON bet_codes
FOR UPDATE
USING (auth.is_admin());

CREATE POLICY "Users can update their own draft bet codes"
ON bet_codes
FOR UPDATE
USING (
  auth.is_regular_user() AND 
  user_id = auth.uid() AND 
  status = 'draft'
);

CREATE POLICY "Super admin can delete any bet code"
ON bet_codes
FOR DELETE
USING (auth.is_super_admin());

CREATE POLICY "Admin can delete any bet code"
ON bet_codes
FOR DELETE
USING (auth.is_admin());

CREATE POLICY "Users can delete their own draft bet codes"
ON bet_codes
FOR DELETE
USING (
  auth.is_regular_user() AND 
  user_id = auth.uid() AND 
  status = 'draft'
);

-- 10. Policies cho bảng BetCodeLines
CREATE POLICY "Super admin can view all bet code lines"
ON bet_code_lines
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view all bet code lines"
ON bet_code_lines
FOR SELECT
USING (auth.is_admin());

CREATE POLICY "Users can view their own bet code lines"
ON bet_code_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bet_codes bc
    WHERE bc.id = bet_code_id AND bc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own bet code lines"
ON bet_code_lines
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bet_codes bc
    WHERE bc.id = bet_code_id AND bc.user_id = auth.uid() AND bc.status = 'draft'
  )
);

CREATE POLICY "Admin can insert any bet code lines"
ON bet_code_lines
FOR INSERT
WITH CHECK (auth.is_admin_or_super_admin());

CREATE POLICY "Super admin can update any bet code line"
ON bet_code_lines
FOR UPDATE
USING (auth.is_super_admin());

CREATE POLICY "Admin can update any bet code line"
ON bet_code_lines
FOR UPDATE
USING (auth.is_admin());

CREATE POLICY "Users can update their own draft bet code lines"
ON bet_code_lines
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bet_codes bc
    WHERE bc.id = bet_code_id AND bc.user_id = auth.uid() AND bc.status = 'draft'
  )
);

CREATE POLICY "Super admin can delete any bet code line"
ON bet_code_lines
FOR DELETE
USING (auth.is_super_admin());

CREATE POLICY "Admin can delete any bet code line"
ON bet_code_lines
FOR DELETE
USING (auth.is_admin());

CREATE POLICY "Users can delete their own draft bet code lines"
ON bet_code_lines
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bet_codes bc
    WHERE bc.id = bet_code_id AND bc.user_id = auth.uid() AND bc.status = 'draft'
  )
);

-- 11. Policies cho bảng LotteryResults
CREATE POLICY "Anyone can view verified lottery results"
ON lottery_results
FOR SELECT
USING (verified = TRUE);

CREATE POLICY "Admin or super admin can view all lottery results"
ON lottery_results
FOR SELECT
USING (auth.is_admin_or_super_admin());

CREATE POLICY "Super admin can modify lottery results"
ON lottery_results
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can insert and update lottery results"
ON lottery_results
FOR INSERT
WITH CHECK (auth.is_admin());

CREATE POLICY "Admin can update lottery results"
ON lottery_results
FOR UPDATE
USING (auth.is_admin());

-- 12. Policies cho bảng Verifications
CREATE POLICY "Super admin can view all verifications"
ON verifications
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view their own verifications"
ON verifications
FOR SELECT
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

CREATE POLICY "Super admin can modify verifications"
ON verifications
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can insert their own verifications"
ON verifications
FOR INSERT
WITH CHECK (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

CREATE POLICY "Admin can update their own verifications"
ON verifications
FOR UPDATE
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

-- 13. Policies cho bảng AdminBetTypeSettings
CREATE POLICY "Super admin can view all admin bet type settings"
ON admin_bet_type_settings
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view their own bet type settings"
ON admin_bet_type_settings
FOR SELECT
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

CREATE POLICY "Super admin can modify admin bet type settings"
ON admin_bet_type_settings
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can manage their own bet type settings"
ON admin_bet_type_settings
FOR ALL
USING (
  auth.is_admin() AND 
  admin_id = auth.uid() AND
  (user_id IS NULL OR user_id IN (
    SELECT id FROM users WHERE created_by = auth.uid()
  ))
);

-- 14. Policies cho bảng AdminStationSettings
CREATE POLICY "Super admin can view all admin station settings"
ON admin_station_settings
FOR SELECT
USING (auth.is_super_admin());

CREATE POLICY "Admin can view their own station settings"
ON admin_station_settings
FOR SELECT
USING (
  auth.is_admin() AND 
  admin_id = auth.uid()
);

CREATE POLICY "Super admin can modify admin station settings"
ON admin_station_settings
FOR ALL
USING (auth.is_super_admin());

CREATE POLICY "Admin can manage their own station settings"
ON admin_station_settings
FOR ALL
USING (
  auth.is_admin() AND 
  admin_id = auth.uid() AND
  (user_id IS NULL OR user_id IN (
    SELECT id FROM users WHERE created_by = auth.uid()
  ))
);

-- 15. Policies cho bảng NumberCombinations
CREATE POLICY "Anyone can view active number combinations"
ON number_combinations
FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admin or super admin can view all number combinations"
ON number_combinations
FOR SELECT
USING (auth.is_admin_or_super_admin());

CREATE POLICY "Super admin can modify number combinations"
ON number_combinations
FOR ALL
USING (auth.is_super_admin());