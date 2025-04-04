// src/app/actions/admin.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function fetchAdmins(search = '') {
  try {
    const supabase = await createClient();

    // Truy vấn danh sách admin từ Supabase
    let query = supabase.from('users').select('*').eq('role_id', 2);

    // Thêm điều kiện tìm kiếm nếu có
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching admins:', error);
      return { data: [], error: error.message };
    }

    // Nếu không có dữ liệu, trả về mảng rỗng
    if (!data || data.length === 0) {
      return { data: [] };
    }

    // Lấy thêm thông tin settings của admin
    const adminIds = data.map((admin) => admin.id);
    const { data: adminSettings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .in('admin_id', adminIds);

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      // Vẫn trả về dữ liệu admin nếu lỗi settings
      return {
        data: data.map((admin) => ({ ...admin, settings: {} })),
        error: `Settings error: ${settingsError.message}`,
      };
    }

    // Map settings vào từng admin
    const adminsWithSettings = data.map((admin) => {
      const settings =
        adminSettings?.find((s) => s.admin_id === admin.id) || {};
      return {
        ...admin,
        settings,
      };
    });

    return { data: adminsWithSettings };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: [], error: 'Internal server error' };
  }
}

export async function createAdmin(formData) {
  try {
    // Sử dụng supabaseAdmin cho các hành động quản trị
    const username = formData.get('username');
    const email = formData.get('email');
    const full_name = formData.get('full_name') || '';
    const password = formData.get('password');
    const max_users = parseInt(formData.get('max_users') || '10', 10);

    if (!username || !email || !password) {
      return {
        data: null,
        error: 'Username, email, and password are required',
      };
    }

    // Lấy role_id của admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !roleData) {
      return { data: null, error: 'Admin role not found' };
    }

    // Tạo user mới với role admin trong Supabase Auth
    const { data: authData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError || !authData?.user) {
      return {
        data: null,
        error: userError?.message || 'Could not create user',
      };
    }

    // Thêm thông tin user vào bảng users
    const { data: newAdmin, error: adminError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          username,
          email,
          full_name,
          role_id: roleData.id,
        },
      ])
      .select()
      .single();

    if (adminError) {
      // Xóa user đã tạo nếu có lỗi
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: adminError.message };
    }

    // Tạo admin_settings cho admin mới
    const { error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .insert([
        {
          admin_id: authData.user.id,
          max_users: max_users,
        },
      ]);

    if (settingsError) {
      console.error('Error creating admin settings:', settingsError);
    }

    // Add default station settings
    const { data: stations, error: stationsError } = await supabaseAdmin
      .from('stations')
      .select('id')
      .eq('is_active', true);

    if (!stationsError && stations) {
      for (const station of stations) {
        await supabaseAdmin.from('admin_station_settings').insert([
          {
            admin_id: authData.user.id,
            station_id: station.id,
            is_enabled_for_users: true,
          },
        ]);
      }
    }

    revalidatePath('/admin/admins');

    return { data: newAdmin };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function updateAdmin(formData) {
  try {
    const id = formData.get('id');
    const username = formData.get('username');
    const email = formData.get('email');
    const full_name = formData.get('full_name') || '';
    const is_active = formData.get('is_active') === 'true';

    if (!id || !username || !email) {
      return { data: null, error: 'ID, username, and email are required' };
    }

    // Kiểm tra nếu email thay đổi
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { data: null, error: 'Admin not found' };
    }

    // Cập nhật email trong Auth nếu thay đổi
    if (existingUser.email !== email) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });

      if (authError) {
        return { data: null, error: authError.message };
      }
    }

    // Cập nhật user trong database
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username,
        email,
        full_name,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    revalidatePath('/admin/admins');

    return { data: updatedAdmin };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function updateAdminPassword(formData) {
  try {
    const id = formData.get('id');
    const password = formData.get('password');

    if (!id || !password || password.length < 6) {
      return { data: null, error: 'Password must be at least 6 characters' };
    }

    // Kiểm tra nếu admin tồn tại
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return { data: null, error: 'Admin not found' };
    }

    // Cập nhật mật khẩu
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(id, { password });

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { data: { id }, success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function updateAdminSettings(formData) {
  try {
    const id = formData.get('id');
    const max_users = parseInt(formData.get('max_users') || '10', 10);

    if (isNaN(max_users) || max_users < 0) {
      return { data: null, error: 'Max users must be a positive number' };
    }

    // Kiểm tra nếu admin tồn tại
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return { data: null, error: 'Admin not found' };
    }

    // Kiểm tra nếu settings tồn tại
    const { data: existingSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .eq('admin_id', id)
      .single();

    let result;

    if (settingsError && settingsError.code === 'PGRST116') {
      // Settings không tồn tại, tạo mới
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .insert([
          {
            admin_id: id,
            max_users,
          },
        ])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      result = data;
    } else {
      // Settings tồn tại, cập nhật
      const updates = {};

      if (!isNaN(max_users)) updates.max_users = max_users;

      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .update(updates)
        .eq('admin_id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      result = data;
    }

    revalidatePath('/admin/admins');

    return { data: result };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function toggleAdminStatus(id, currentStatus) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/admins');

    return { data };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function getAdminById(id) {
  try {
    // Lấy thông tin admin
    const { data: admin, error } = await supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', id)
      .eq('roles.name', 'admin')
      .single();

    if (error) {
      return { data: null, error: 'Admin not found' };
    }

    // Lấy thông tin settings của admin
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .eq('admin_id', id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching admin settings:', settingsError);
    }

    return {
      data: {
        ...admin,
        settings: settings || {},
      },
    };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}
