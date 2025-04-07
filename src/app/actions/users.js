// src/app/actions/users.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Hàm lấy danh sách người dùng với các bộ lọc
export async function fetchUsers({
  currentUserId,
  isSuperAdmin = false,
  searchTerm = '',
  activeFilter,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 10,
} = {}) {
  try {
    // Lấy ID của role user từ bảng roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: null, error: roleError.message };
    }

    const userRoleId = roleData.id;

    // Khởi tạo query để lấy danh sách user
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('role_id', userRoleId);

    // Nếu là Admin thường, chỉ xem được user do mình tạo
    if (!isSuperAdmin && currentUserId) {
      query = query.eq('created_by', currentUserId);
    }

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
      data: users,
      error,
      count,
    } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: error.message };
    }

    // Nếu là Super Admin và có users
    if (isSuperAdmin && users && users.length > 0) {
      // Lấy danh sách unique creator_ids
      const creatorIds = [
        ...new Set(users.map((user) => user.created_by).filter(Boolean)),
      ];

      // Lấy thông tin chi tiết của các admin
      if (creatorIds.length > 0) {
        const { data: creators, error: creatorsError } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name')
          .in('id', creatorIds);

        if (creatorsError) {
          console.error('Error fetching creators:', creatorsError);
          // Continue without creator info
        } else if (creators) {
          // Map creators to users
          const creatorsMap = creators.reduce((acc, creator) => {
            acc[creator.id] = creator;
            return acc;
          }, {});

          // Add creator info to each user
          users.forEach((user) => {
            if (user.created_by && creatorsMap[user.created_by]) {
              user.creator = creatorsMap[user.created_by];
            }
          });
        }
      }
    }

    return {
      data: {
        users,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchUsers:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm kiểm tra số lượng user đã tạo của một admin
export async function checkUserLimit(adminId) {
  try {
    // Lấy thông tin giới hạn số user tối đa
    const { data: adminSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('max_users')
      .eq('admin_id', adminId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching admin settings:', settingsError);
      return { data: null, error: settingsError.message };
    }

    const maxUsers = adminSettings?.max_users || 10;

    // Lấy ID của role user từ bảng roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: null, error: roleError.message };
    }

    const userRoleId = roleData.id;

    // Đếm số lượng user do admin này tạo
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', adminId)
      .eq('role_id', userRoleId);

    if (countError) {
      console.error('Error counting users:', countError);
      return { data: null, error: countError.message };
    }

    return {
      data: {
        currentCount: count || 0,
        maxUsers,
        canCreateMore: (count || 0) < maxUsers,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in checkUserLimit:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm tạo mới user
export async function createUser({ username, password, fullName, createdBy }) {
  try {
    // Kiểm tra giới hạn tạo user
    const { data: limitData, error: limitError } =
      await checkUserLimit(createdBy);

    if (limitError) {
      return { data: null, error: limitError };
    }

    if (!limitData.canCreateMore) {
      return {
        data: null,
        error: `Bạn đã đạt giới hạn tối đa ${limitData.maxUsers} người dùng`,
      };
    }

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

    // 2. Lấy ID của role user từ bảng roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: null, error: roleError.message };
    }

    const userRoleId = roleData.id;

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

    // 4. Thêm user vào bảng users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        username,
        email,
        full_name: fullName,
        role_id: userRoleId,
        created_by: createdBy,
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

    revalidatePath('/admin/users');
    return { data: userData, error: null };
  } catch (error) {
    console.error('Unexpected error in createUser:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm cập nhật thông tin user
export async function updateUser({
  id,
  fullName,
  currentUserId,
  isSuperAdmin,
}) {
  try {
    // Kiểm tra quyền cập nhật (chỉ admin tạo ra user hoặc super admin)
    if (!isSuperAdmin) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('created_by')
        .eq('id', id)
        .single();

      if (userError) {
        console.error('Error checking user permissions:', userError);
        return { data: null, error: userError.message };
      }

      if (userData.created_by !== currentUserId) {
        return {
          data: null,
          error: 'Bạn không có quyền cập nhật người dùng này',
        };
      }
    }

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
      console.error('Error updating user:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/users');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateUser:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm kích hoạt/vô hiệu hóa user
export async function toggleUserStatus({
  id,
  isActive,
  currentUserId,
  isSuperAdmin,
}) {
  try {
    // Kiểm tra quyền cập nhật (chỉ admin tạo ra user hoặc super admin)
    if (!isSuperAdmin) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('created_by')
        .eq('id', id)
        .single();

      if (userError) {
        console.error('Error checking user permissions:', userError);
        return { data: null, error: userError.message };
      }

      if (userData.created_by !== currentUserId) {
        return {
          data: null,
          error: 'Bạn không có quyền thay đổi trạng thái người dùng này',
        };
      }
    }

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
      console.error('Error toggling user status:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/users');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in toggleUserStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm khôi phục mật khẩu user
export async function resetUserPassword({
  id,
  newPassword,
  currentUserId,
  isSuperAdmin,
}) {
  try {
    // Kiểm tra quyền cập nhật (chỉ admin tạo ra user hoặc super admin)
    if (!isSuperAdmin) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('created_by')
        .eq('id', id)
        .single();

      if (userError) {
        console.error('Error checking user permissions:', userError);
        return { data: null, error: userError.message };
      }

      if (userData.created_by !== currentUserId) {
        return {
          data: null,
          error: 'Bạn không có quyền đặt lại mật khẩu người dùng này',
        };
      }
    }

    // Cập nhật mật khẩu trong Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      console.error('Error resetting user password:', error);
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in resetUserPassword:', error);
    return { data: null, error: 'Internal server error' };
  }
}
