// src/app/actions/admin.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Hàm lấy danh sách admins với các bộ lọc
export async function fetchAdmins({
  searchTerm = '',
  activeFilter,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 10,
} = {}) {
  try {
    // Lấy ID của role admin từ bảng roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError) {
      console.error('Error fetching admin role:', roleError);
      return { data: null, error: roleError.message };
    }

    const adminRoleId = roleData.id;

    // Khởi tạo query để lấy danh sách admin
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('role_id', adminRoleId);

    // Áp dụng các bộ lọc
    if (searchTerm) {
      query = query.or(
        `username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`
      );
    }

    if (activeFilter !== undefined) {
      query = query.eq('is_active', activeFilter);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      // Thêm 1 ngày để bao gồm cả ngày cuối
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('created_at', nextDay.toISOString());
    }

    // Phân trang
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Thực hiện truy vấn với phân trang
    const {
      data: admins,
      error,
      count,
    } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error fetching admins:', error);
      return { data: null, error: error.message };
    }

    // Lấy admin_settings cho từng admin
    const adminIds = admins.map((admin) => admin.id);

    const { data: adminSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .in('admin_id', adminIds);

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      // Không cần return error, tiếp tục với dữ liệu users
    }

    // Map settings vào admin data
    const adminsWithSettings = admins.map((admin) => {
      const settings = adminSettings?.find((s) => s.admin_id === admin.id);
      return {
        ...admin,
        max_users: settings?.max_users || 10,
      };
    });

    return {
      data: {
        admins: adminsWithSettings,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchAdmins:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm tạo mới admin
export async function createAdmin({ username, password, fullName }) {
  try {
    // Tạo email từ username
    const email = `${username}@gmail.com`;

    // 1. Kiểm tra xem username đã tồn tại chưa
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return { data: null, error: 'Username đã tồn tại' };
    }

    // 2. Lấy ID của role admin từ bảng roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError) {
      console.error('Error fetching admin role:', roleError);
      return { data: null, error: roleError.message };
    }

    const adminRoleId = roleData.id;

    // 3. Tạo user trong Auth với email và password
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Bỏ qua xác minh email
      });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { data: null, error: authError.message };
    }

    // 4. Thêm user vào bảng users với role admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        username,
        email,
        full_name: fullName,
        role_id: adminRoleId,
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error inserting user data:', userError);
      // Nếu lỗi, xóa user đã tạo trong Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { data: null, error: userError.message };
    }

    // 5. Tạo admin_settings mặc định
    const { error: settingError } = await supabaseAdmin
      .from('admin_settings')
      .insert({
        admin_id: authUser.user.id,
        max_users: 10, // Giá trị mặc định
      });

    if (settingError) {
      console.error('Error creating admin settings:', settingError);
      // Không cần xóa user vì không ảnh hưởng đến functionality chính
    }

    revalidatePath('/admin/admins');
    return { data: userData, error: null };
  } catch (error) {
    console.error('Unexpected error in createAdmin:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm cập nhật thông tin admin
export async function updateAdmin({ id, fullName }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating admin:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/admins');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateAdmin:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm kích hoạt/vô hiệu hóa admin
export async function toggleAdminStatus({ id, isActive }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling admin status:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/admins');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in toggleAdminStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm cài đặt số lượng tài khoản user tối đa
export async function updateAdminMaxUsers({ adminId, maxUsers }) {
  try {
    // Kiểm tra xem admin_settings đã tồn tại cho admin này chưa
    const { data: existingSetting, error: checkError } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .eq('admin_id', adminId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking admin settings:', checkError);
      return { data: null, error: checkError.message };
    }

    let resultData = null;

    if (existingSetting) {
      // Cập nhật setting nếu đã tồn tại
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .update({
          max_users: maxUsers,
          updated_at: new Date().toISOString(),
        })
        .eq('admin_id', adminId)
        .select()
        .single();

      if (error) {
        console.error('Error updating admin max users:', error);
        return { data: null, error: error.message };
      }

      resultData = data;
    } else {
      // Tạo mới setting nếu chưa tồn tại
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .insert({
          admin_id: adminId,
          max_users: maxUsers,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating admin max users:', error);
        return { data: null, error: error.message };
      }

      resultData = data;
    }

    // Lấy dữ liệu admin với max_users mới
    const { data: adminData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', adminId)
      .single();

    // Kết hợp dữ liệu
    const updatedAdmin = {
      ...adminData,
      max_users: resultData.max_users,
    };

    revalidatePath('/admin/admins');
    return { data: updatedAdmin, error: null };
  } catch (error) {
    console.error('Unexpected error in updateAdminMaxUsers:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm khôi phục mật khẩu admin
export async function resetAdminPassword({ id, newPassword }) {
  try {
    // Cập nhật mật khẩu trong Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      console.error('Error resetting admin password:', error);
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in resetAdminPassword:', error);
    return { data: null, error: 'Internal server error' };
  }
}
