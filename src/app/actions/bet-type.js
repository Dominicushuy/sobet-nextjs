// src/app/actions/bet-type.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Fetch bet types based on user role and permissions
export async function fetchBetTypes() {
  try {
    const supabase = await createClient();

    // Get current user and role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Unauthorized' };
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return { data: [], error: 'Unable to verify user role' };
    }

    const role = userData.roles?.name;
    let query;

    if (role === 'super_admin') {
      // Super admin sees all bet types
      query = supabase
        .from('bet_types')
        .select('*')
        .order('name', { ascending: true });
    } else if (role === 'admin') {
      // Admin sees only globally active bet types
      query = supabase
        .from('bet_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
    } else {
      // Regular user sees only bet types enabled for them
      // Use the custom function we created
      query = supabase
        .rpc('get_active_bet_types_for_user', { p_user_id: user.id })
        .order('name', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bet types:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('Unexpected error in fetchBetTypes:', error);
    return { data: [], error: 'Internal server error' };
  }
}

// Create a new bet type (Super Admin only)
export async function createBetType(betTypeData) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { data: null, error: 'Only Super Admin can create bet types' };
    }

    const {
      name,
      aliases,
      applicable_regions,
      bet_rule,
      matching_method,
      payout_rate,
      combinations,
      is_permutation,
      special_calc,
      is_active,
    } = betTypeData;

    if (
      !name ||
      !applicable_regions ||
      !bet_rule ||
      !matching_method ||
      !payout_rate ||
      !combinations
    ) {
      return { data: null, error: 'Required fields are missing' };
    }

    const { data, error } = await supabase
      .from('bet_types')
      .insert([
        {
          name,
          aliases: Array.isArray(aliases) ? aliases : [],
          applicable_regions: Array.isArray(applicable_regions)
            ? applicable_regions
            : [applicable_regions],
          bet_rule: Array.isArray(bet_rule) ? bet_rule : [bet_rule],
          matching_method,
          payout_rate:
            typeof payout_rate === 'object'
              ? payout_rate
              : JSON.parse(payout_rate),
          combinations:
            typeof combinations === 'object'
              ? combinations
              : JSON.parse(combinations),
          is_permutation: is_permutation || false,
          special_calc,
          is_active: is_active ?? true,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating bet type:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-types');
    return { data: data[0] || null };
  } catch (error) {
    console.error('Unexpected error in createBetType:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update an existing bet type (Super Admin only)
export async function updateBetType(id, betTypeData) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { data: null, error: 'Only Super Admin can update bet types' };
    }

    const {
      name,
      aliases,
      applicable_regions,
      bet_rule,
      matching_method,
      payout_rate,
      combinations,
      is_permutation,
      special_calc,
      is_active,
    } = betTypeData;

    if (
      !name ||
      !applicable_regions ||
      !bet_rule ||
      !matching_method ||
      !payout_rate ||
      !combinations
    ) {
      return { data: null, error: 'Required fields are missing' };
    }

    const { data, error } = await supabase
      .from('bet_types')
      .update({
        name,
        aliases: Array.isArray(aliases) ? aliases : [],
        applicable_regions: Array.isArray(applicable_regions)
          ? applicable_regions
          : [applicable_regions],
        bet_rule: Array.isArray(bet_rule) ? bet_rule : [bet_rule],
        matching_method,
        payout_rate:
          typeof payout_rate === 'object'
            ? payout_rate
            : JSON.parse(payout_rate),
        combinations:
          typeof combinations === 'object'
            ? combinations
            : JSON.parse(combinations),
        is_permutation: is_permutation || false,
        special_calc,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating bet type:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-types');
    return { data: data[0] || null };
  } catch (error) {
    console.error('Unexpected error in updateBetType:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Delete a bet type (Super Admin only)
export async function deleteBetType(id) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { success: false, error: 'Only Super Admin can delete bet types' };
    }

    const { error } = await supabase.from('bet_types').delete().eq('id', id);

    if (error) {
      console.error('Error deleting bet type:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/bet-types');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteBetType:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Toggle bet type status (Global activation by Super Admin / User-specific by Admin)
export async function toggleBetTypeStatus(id, currentStatus) {
  try {
    const supabase = await createClient();

    // Get current user and role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError) {
      return { data: null, error: 'Unable to verify user role' };
    }

    const role = userData.roles?.name;

    if (role === 'super_admin') {
      // Super admin toggles global bet type status
      const { data, error } = await supabase
        .from('bet_types')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error toggling bet type status:', error);
        return { data: null, error: error.message };
      }

      revalidatePath('/admin/bet-types');
      return { data: data[0] || null };
    } else if (role === 'admin') {
      // Admin toggles bet type status only for their users
      // First check if bet type is globally active
      const { data: betType, error: betTypeError } = await supabase
        .from('bet_types')
        .select('is_active')
        .eq('id', id)
        .single();

      if (betTypeError) {
        return { data: null, error: 'Bet type not found' };
      }

      if (!betType.is_active) {
        return {
          data: null,
          error: 'Cannot enable a globally disabled bet type',
        };
      }

      // Check if admin-specific setting exists
      const { data: existingSetting, error: settingError } = await supabase
        .from('admin_bet_type_settings')
        .select('id')
        .eq('admin_id', user.id)
        .eq('bet_type_id', id)
        .is('user_id', null)
        .single();

      if (settingError && settingError.code !== 'PGRST116') {
        return { data: null, error: 'Error checking bet type settings' };
      }

      let result;

      if (!existingSetting) {
        // Create new setting
        const { data, error } = await supabase
          .from('admin_bet_type_settings')
          .insert([
            {
              admin_id: user.id,
              bet_type_id: id,
              payout_rate: {}, // Default empty object
              is_enabled_for_users: !currentStatus, // Toggle from current status
              user_id: null, // This applies to all users of this admin
            },
          ])
          .select();

        if (error) {
          console.error('Error creating bet type setting:', error);
          return { data: null, error: error.message };
        }

        result = { id, is_enabled_for_users: !currentStatus };
      } else {
        // Update existing setting
        const { data, error } = await supabase
          .from('admin_bet_type_settings')
          .update({
            is_enabled_for_users: !currentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSetting.id)
          .select();

        if (error) {
          console.error('Error updating bet type setting:', error);
          return { data: null, error: error.message };
        }

        result = data[0] || null;
      }

      revalidatePath('/admin/bet-types');
      return { data: result };
    } else {
      return { data: null, error: 'Insufficient permissions' };
    }
  } catch (error) {
    console.error('Unexpected error in toggleBetTypeStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Toggle bet type status for a specific user (Admin only)
export async function toggleUserBetTypeStatus(
  betTypeId,
  userId,
  currentStatus
) {
  try {
    const supabase = await createClient();

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Verify admin role and that they created this user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'admin') {
      return {
        data: null,
        error: 'Only Admin can update user bet type settings',
      };
    }

    // Verify admin created this user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('created_by')
      .eq('id', userId)
      .single();

    if (targetError || targetUser.created_by !== user.id) {
      return {
        data: null,
        error: 'You can only update settings for your own users',
      };
    }

    // First check if bet type is globally active
    const { data: betType, error: betTypeError } = await supabase
      .from('bet_types')
      .select('is_active')
      .eq('id', betTypeId)
      .single();

    if (betTypeError || !betType.is_active) {
      return {
        data: null,
        error: 'Cannot enable a globally disabled bet type',
      };
    }

    // Check if user-specific setting exists
    const { data: existingSetting, error: settingError } = await supabase
      .from('admin_bet_type_settings')
      .select('id, payout_rate')
      .eq('admin_id', user.id)
      .eq('bet_type_id', betTypeId)
      .eq('user_id', userId)
      .single();

    let result;

    if (settingError && settingError.code === 'PGRST116') {
      // Create new setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .insert([
          {
            admin_id: user.id,
            bet_type_id: betTypeId,
            user_id: userId,
            payout_rate: {}, // Default empty object
            is_enabled_for_users: !currentStatus,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating user bet type setting:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    } else {
      // Update existing setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .update({
          is_enabled_for_users: !currentStatus,
          updated_at: new Date().toISOString(),
          // Keep the existing payout_rate
          payout_rate: existingSetting.payout_rate || {},
        })
        .eq('id', existingSetting.id)
        .select();

      if (error) {
        console.error('Error updating user bet type setting:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    }

    revalidatePath('/admin/users');
    return { data: result };
  } catch (error) {
    console.error('Unexpected error in toggleUserBetTypeStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update bet type payout rates for admin's users
export async function updateBetTypePayoutRates(betTypeId, payoutRateData) {
  try {
    const supabase = await createClient();

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Verify admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || !['admin', 'super_admin'].includes(userData.roles?.name)) {
      return {
        data: null,
        error: 'Only Admin and Super Admin can update payout rates',
      };
    }

    // First check if bet type is globally active
    const { data: betType, error: betTypeError } = await supabase
      .from('bet_types')
      .select('is_active')
      .eq('id', betTypeId)
      .single();

    if (betTypeError || !betType.is_active) {
      return {
        data: null,
        error: 'Cannot update settings for a globally disabled bet type',
      };
    }

    // Check if global setting exists
    const { data: existingSetting, error: settingError } = await supabase
      .from('admin_bet_type_settings')
      .select('id')
      .eq('admin_id', user.id)
      .eq('bet_type_id', betTypeId)
      .is('user_id', null)
      .single();

    let result;

    if (settingError && settingError.code === 'PGRST116') {
      // Create new setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .insert([
          {
            admin_id: user.id,
            bet_type_id: betTypeId,
            user_id: null,
            payout_rate:
              typeof payoutRateData === 'object'
                ? payoutRateData
                : JSON.parse(payoutRateData),
            is_enabled_for_users: true,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating bet type payout rates:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    } else {
      // Update existing setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .update({
          payout_rate:
            typeof payoutRateData === 'object'
              ? payoutRateData
              : JSON.parse(payoutRateData),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id)
        .select();

      if (error) {
        console.error('Error updating bet type payout rates:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    }

    revalidatePath('/admin/bet-types');
    return { data: result };
  } catch (error) {
    console.error('Unexpected error in updateBetTypePayoutRates:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update bet type payout rates for a specific user (Admin only)
export async function updateUserBetTypePayoutRates(
  betTypeId,
  userId,
  payoutRateData
) {
  try {
    const supabase = await createClient();

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Verify admin role and that they created this user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'admin') {
      return {
        data: null,
        error: 'Only Admin can update user bet type settings',
      };
    }

    // Verify admin created this user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('created_by')
      .eq('id', userId)
      .single();

    if (targetError || targetUser.created_by !== user.id) {
      return {
        data: null,
        error: 'You can only update settings for your own users',
      };
    }

    // First check if bet type is globally active
    const { data: betType, error: betTypeError } = await supabase
      .from('bet_types')
      .select('is_active')
      .eq('id', betTypeId)
      .single();

    if (betTypeError || !betType.is_active) {
      return {
        data: null,
        error: 'Cannot update settings for a globally disabled bet type',
      };
    }

    // Check if user-specific setting exists
    const { data: existingSetting, error: settingError } = await supabase
      .from('admin_bet_type_settings')
      .select('id, is_enabled_for_users')
      .eq('admin_id', user.id)
      .eq('bet_type_id', betTypeId)
      .eq('user_id', userId)
      .single();

    let result;

    if (settingError && settingError.code === 'PGRST116') {
      // Create new setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .insert([
          {
            admin_id: user.id,
            bet_type_id: betTypeId,
            user_id: userId,
            payout_rate:
              typeof payoutRateData === 'object'
                ? payoutRateData
                : JSON.parse(payoutRateData),
            is_enabled_for_users: true,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating user bet type payout rates:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    } else {
      // Update existing setting
      const { data, error } = await supabase
        .from('admin_bet_type_settings')
        .update({
          payout_rate:
            typeof payoutRateData === 'object'
              ? payoutRateData
              : JSON.parse(payoutRateData),
          // Keep the existing enabled status
          is_enabled_for_users: existingSetting.is_enabled_for_users,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id)
        .select();

      if (error) {
        console.error('Error updating user bet type payout rates:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    }

    revalidatePath('/admin/users');
    return { data: result };
  } catch (error) {
    console.error('Unexpected error in updateUserBetTypePayoutRates:', error);
    return { data: null, error: 'Internal server error' };
  }
}
