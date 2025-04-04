// src/app/actions/users.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function fetchUsers(
  adminId,
  search = '',
  page = 1,
  pageSize = 10
) {
  try {
    const supabase = await createClient();

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Get user role_id
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: [], total: 0, error: 'Could not fetch user role' };
    }

    const userRoleId = roleData.id;

    // Get admin role to check if this is a super_admin
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', adminId)
      .single();

    if (adminError) {
      console.error('Error fetching admin info:', adminError);
      return { data: [], total: 0, error: 'Could not fetch admin info' };
    }

    const isSuperAdmin = adminData.roles?.name === 'super_admin';

    // Query users list
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role_id', userRoleId);

    // If it's a regular admin, only show users created by them
    // If it's a super admin, show all users with user role
    if (!isSuperAdmin) {
      query = query.eq('created_by', adminId);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    // Add pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return { data: [], total: 0, error: error.message };
    }

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: [], total: 0, error: 'Internal server error' };
  }
}

export async function getUserLimit(adminId, isSuperAdmin = false) {
  try {
    if (!adminId) {
      return {
        data: { maxUsers: 0, currentCount: 0 },
        error: 'Admin ID is required',
      };
    }

    if (isSuperAdmin) {
      // For super admin, get total user count
      const { data: totalCount, error } = await getTotalUserCount();

      return {
        data: {
          maxUsers: null, // No limit for super admin
          currentCount: totalCount || 0,
        },
        error: error,
      };
    } else {
      // For regular admin, get their limits and current count
      const supabase = await createClient();

      // Get max_users from admin_settings
      const { data: settings, error: settingsError } = await supabase
        .from('admin_settings')
        .select('max_users')
        .eq('admin_id', adminId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching admin settings:', settingsError);
        return {
          data: { maxUsers: 10, currentCount: 0 },
          error: settingsError.message,
        };
      }

      // Get user role_id
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        return {
          data: { maxUsers: settings?.max_users || 10, currentCount: 0 },
          error: roleError.message,
        };
      }

      // Count users created by this admin
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleData.id)
        .eq('created_by', adminId);

      if (countError) {
        console.error('Error counting users:', countError);
        return {
          data: { maxUsers: settings?.max_users || 10, currentCount: 0 },
          error: countError.message,
        };
      }

      return {
        data: {
          maxUsers: settings?.max_users || 10,
          currentCount: count || 0,
        },
        error: null,
      };
    }
  } catch (error) {
    console.error('Server action error in getUserLimit:', error);
    return {
      data: { maxUsers: 0, currentCount: 0 },
      error: 'Internal server error',
    };
  }
}

export async function getUserMaxCount(adminId) {
  try {
    const supabase = await createClient();

    // Get max_users from admin_settings
    const { data, error } = await supabase
      .from('admin_settings')
      .select('max_users')
      .eq('admin_id', adminId)
      .single();

    if (error) {
      console.error('Error fetching admin settings:', error);
      return { data: 10, error: error.message }; // Default to 10
    }

    return { data: data.max_users };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: 10, error: 'Internal server error' }; // Default to 10
  }
}

export async function getCurrentUserCount(adminId) {
  try {
    const supabase = await createClient();

    // Get user role_id
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: 0, error: 'Could not fetch user role' };
    }

    // Count users created by this admin
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleData.id)
      .eq('created_by', adminId);

    if (error) {
      console.error('Error counting users:', error);
      return { data: 0, error: error.message };
    }

    return { data: count || 0 };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: 0, error: 'Internal server error' };
  }
}

export async function createUser(formData) {
  try {
    const adminId = formData.get('admin_id');
    const username = formData.get('username');
    const email = formData.get('email');
    const full_name = formData.get('full_name') || '';
    const password = formData.get('password');

    // Validate input
    if (!username || !email || !password || !adminId) {
      return {
        data: null,
        error: 'Username, email, password, and admin_id are required',
      };
    }

    // Check user limit
    const { data: maxUsers, error: maxError } = await getUserMaxCount(adminId);
    if (maxError) {
      return { data: null, error: maxError };
    }

    const { data: currentCount, error: countError } =
      await getCurrentUserCount(adminId);
    if (countError) {
      return { data: null, error: countError };
    }

    if (currentCount >= maxUsers) {
      return {
        data: null,
        error: `Maximum user limit reached (${maxUsers}). Contact super admin to increase limit.`,
      };
    }

    // Get user role_id
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError || !roleData) {
      return { data: null, error: 'User role not found' };
    }

    // Create user in Supabase Auth
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

    // Add user info to users table
    const { data: newUser, error: userInfoError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          username,
          email,
          full_name,
          role_id: roleData.id,
          created_by: adminId,
        },
      ])
      .select()
      .single();

    if (userInfoError) {
      // Clean up Auth user if users table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: userInfoError.message };
    }

    // Create user_global_settings
    const { error: settingsError } = await supabaseAdmin
      .from('user_global_settings')
      .insert([
        {
          admin_id: adminId,
          user_id: authData.user.id,
          bet_multiplier: 0.8,
          commission_rate: 0.0,
        },
      ]);

    if (settingsError) {
      console.error('Error creating user settings:', settingsError);
      // Continue without returning error to maintain consistency
    }

    // Add default bet_type settings
    const { data: betTypes, error: betTypesError } = await supabaseAdmin
      .from('bet_types')
      .select('id')
      .eq('is_active', true);

    if (!betTypesError && betTypes) {
      for (const betType of betTypes) {
        await supabaseAdmin.from('admin_bet_type_settings').insert([
          {
            admin_id: adminId,
            user_id: authData.user.id,
            bet_type_id: betType.id,
            payout_rate: {}, // Default empty object
            is_enabled_for_users: true,
          },
        ]);
      }
    }

    revalidatePath('/admin/users');

    return { data: newUser };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function updateUser(formData) {
  try {
    const id = formData.get('id');
    const username = formData.get('username');
    const email = formData.get('email');
    const full_name = formData.get('full_name') || '';
    const is_active = formData.get('is_active') === 'true';

    if (!id || !username || !email) {
      return { data: null, error: 'ID, username, and email are required' };
    }

    // Check if email has changed
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { data: null, error: 'User not found' };
    }

    // Update email in Auth if changed
    if (existingUser.email !== email) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });

      if (authError) {
        return { data: null, error: authError.message };
      }
    }

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabaseAdmin
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

    revalidatePath('/admin/users');

    return { data: updatedUser };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function resetUserPassword(formData) {
  try {
    const id = formData.get('id');
    const password = formData.get('password');

    if (!id || !password || password.length < 6) {
      return { data: null, error: 'Password must be at least 6 characters' };
    }

    // Check if user exists
    const { data: userExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !userExists) {
      return { data: null, error: 'User not found' };
    }

    // Update password
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

export async function toggleUserStatus(id, currentStatus) {
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

    revalidatePath('/admin/users');

    return { data };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function deleteUser(id) {
  try {
    // Delete user from Supabase Auth first
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return { data: null, error: authError.message };
    }

    // Delete related records from user_global_settings
    await supabaseAdmin.from('user_global_settings').delete().eq('user_id', id);

    // Delete related records from admin_bet_type_settings
    await supabaseAdmin
      .from('admin_bet_type_settings')
      .delete()
      .eq('user_id', id);

    // Delete from users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (userError) {
      return { data: null, error: userError.message };
    }

    revalidatePath('/admin/users');

    return { data: { id }, success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function getUserById(id) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Get user global settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_global_settings')
      .select('*')
      .eq('user_id', id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching user settings:', settingsError);
    }

    return {
      data: {
        ...data,
        settings: settings || {},
      },
    };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function getTotalUserCount() {
  try {
    const supabase = await createClient();

    // Get user role_id
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { data: 0, error: 'Could not fetch user role' };
    }

    // Count all users
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleData.id);

    if (error) {
      console.error('Error counting users:', error);
      return { data: 0, error: error.message };
    }

    return { data: count || 0 };
  } catch (error) {
    console.error('Server action error:', error);
    return { data: 0, error: 'Internal server error' };
  }
}
