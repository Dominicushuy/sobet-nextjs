// src/app/actions/admin.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function fetchAdmins(search = '') {
  try {
    // Truy vấn danh sách admin từ Supabase
    let query = supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('roles.name', 'admin');

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
      return { error: error.message };
    }

    // Lấy thêm thông tin settings của admin
    const adminIds = data.map((admin) => admin.id);

    if (adminIds.length === 0) {
      return { data: [] };
    }

    const { data: adminSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .in('admin_id', adminIds);

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return { error: settingsError.message };
    }

    // Map settings vào từng admin
    const adminsWithSettings = data.map((admin) => {
      const settings = adminSettings.find((s) => s.admin_id === admin.id) || {};
      return {
        ...admin,
        settings,
      };
    });

    return { data: adminsWithSettings };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

export async function createAdmin(formData) {
  try {
    const username = formData.get('username');
    const email = formData.get('email');
    const full_name = formData.get('full_name') || '';
    const password = formData.get('password');
    const max_users = parseInt(formData.get('max_users') || '10', 10);

    if (!username || !email || !password) {
      return { error: 'Username, email, and password are required' };
    }

    // Lấy role_id của admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !roleData) {
      return { error: 'Admin role not found' };
    }

    // Tạo user mới với role admin trong Supabase Auth
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError) {
      return { error: userError.message };
    }

    // Thêm thông tin user vào bảng users
    const { data: newAdmin, error: adminError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userData.user.id,
          username,
          email,
          full_name,
          role_id: roleData.id,
          password_hash: 'managed-by-supabase-auth', // Mật khẩu được quản lý bởi Supabase Auth
        },
      ])
      .select()
      .single();

    if (adminError) {
      // Xóa user đã tạo nếu có lỗi
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return { error: adminError.message };
    }

    // Tạo admin_settings cho admin mới
    await supabaseAdmin.from('admin_settings').insert([
      {
        admin_id: userData.user.id,
        max_users: max_users,
        bet_multiplier: 0.8, // Giá trị mặc định
        commission_rate: 4.0, // Giá trị mặc định
      },
    ]);

    revalidatePath('/admin/admins');

    return { data: newAdmin };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
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
      return { error: 'ID, username, and email are required' };
    }

    // Kiểm tra nếu email thay đổi
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { error: 'Admin not found' };
    }

    // Cập nhật email trong Auth nếu thay đổi
    if (existingUser.email !== email) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });

      if (authError) {
        return { error: authError.message };
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
      return { error: updateError.message };
    }

    revalidatePath('/admin/admins');

    return { data: updatedAdmin };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

export async function updateAdminPassword(formData) {
  try {
    const id = formData.get('id');
    const password = formData.get('password');

    if (!id || !password || password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }

    // Kiểm tra nếu admin tồn tại
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return { error: 'Admin not found' };
    }

    // Cập nhật mật khẩu
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(id, { password });

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

export async function updateAdminSettings(formData) {
  try {
    const id = formData.get('id');
    const max_users = parseInt(formData.get('max_users') || '10', 10);
    const bet_multiplier = parseFloat(formData.get('bet_multiplier') || '0.8');
    const commission_rate = parseFloat(
      formData.get('commission_rate') || '4.0'
    );

    if (isNaN(max_users) || max_users < 0) {
      return { error: 'Max users must be a positive number' };
    }

    // Kiểm tra nếu admin tồn tại
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return { error: 'Admin not found' };
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
            bet_multiplier,
            commission_rate,
          },
        ])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      result = data;
    } else {
      // Settings tồn tại, cập nhật
      const updates = {};

      if (!isNaN(max_users)) updates.max_users = max_users;
      if (!isNaN(bet_multiplier)) updates.bet_multiplier = bet_multiplier;
      if (!isNaN(commission_rate)) updates.commission_rate = commission_rate;

      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .update(updates)
        .eq('admin_id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      result = data;
    }

    revalidatePath('/admin/admins');

    return { data: result };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
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
      return { error: error.message };
    }

    revalidatePath('/admin/admins');

    return { data };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
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
      return { error: 'Admin not found' };
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
    return { error: 'Internal server error' };
  }
}
