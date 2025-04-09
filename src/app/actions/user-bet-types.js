// src/app/actions/user-bet-types.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Lấy cài đặt loại cược của người dùng
export async function getUserBetTypeSettings(userId) {
  try {
    // Lấy tất cả loại cược với thông tin về cài đặt của user
    const { data: betTypes, error: betTypesError } = await supabaseAdmin
      .from('bet_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (betTypesError) {
      console.error('Error fetching bet types:', betTypesError);
      return { data: null, error: betTypesError.message };
    }

    // Lấy cài đặt loại cược của user
    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from('user_bet_type_settings')
      .select('*')
      .eq('user_id', userId);

    if (settingsError) {
      console.error('Error fetching user bet type settings:', settingsError);
      return { data: null, error: settingsError.message };
    }

    // Tạo map từ bet_type_id đến user settings
    const settingsMap = {};
    userSettings.forEach((setting) => {
      settingsMap[setting.bet_type_id] = setting;
    });

    // Kết hợp thông tin
    const betTypesWithSettings = betTypes.map((betType) => {
      const userSetting = settingsMap[betType.id];
      return {
        ...betType,
        user_setting: userSetting || null,
        is_active_for_user: userSetting
          ? userSetting.is_active
          : betType.is_active,
        custom_payout_rate: userSetting ? userSetting.payout_rate : null,
        multiplier: userSetting ? userSetting.multiplier : 1,
        setting_id: userSetting ? userSetting.id : null,
      };
    });

    return {
      data: {
        betTypes: betTypesWithSettings,
        userSettings,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in getUserBetTypeSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Cập nhật trạng thái kích hoạt cho loại cược của user
export async function toggleUserBetTypeStatus(
  userId,
  adminId,
  betTypeId,
  isActive
) {
  try {
    const { data: existingSetting } = await supabaseAdmin
      .from('user_bet_type_settings')
      .select('id')
      .eq('user_id', userId)
      .eq('bet_type_id', betTypeId)
      .maybeSingle();

    let result;

    if (existingSetting) {
      // Cập nhật setting đã tồn tại
      result = await supabaseAdmin
        .from('user_bet_type_settings')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id)
        .select()
        .single();
    } else {
      // Tạo setting mới
      result = await supabaseAdmin
        .from('user_bet_type_settings')
        .insert({
          user_id: userId,
          bet_type_id: betTypeId,
          is_active: isActive,
          created_by: adminId,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating user bet type status:', result.error);
      return { data: null, error: result.error.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Unexpected error in toggleUserBetTypeStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Cập nhật tỷ lệ trả thưởng tùy chỉnh cho loại cược của user
export async function updateUserBetTypePayoutRate(
  userId,
  adminId,
  betTypeId,
  payoutRate
) {
  try {
    const { data: existingSetting } = await supabaseAdmin
      .from('user_bet_type_settings')
      .select('id')
      .eq('user_id', userId)
      .eq('bet_type_id', betTypeId)
      .maybeSingle();

    let result;

    if (existingSetting) {
      // Cập nhật setting đã tồn tại
      result = await supabaseAdmin
        .from('user_bet_type_settings')
        .update({
          payout_rate: payoutRate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id)
        .select()
        .single();
    } else {
      // Tạo setting mới
      result = await supabaseAdmin
        .from('user_bet_type_settings')
        .insert({
          user_id: userId,
          bet_type_id: betTypeId,
          payout_rate: payoutRate,
          created_by: adminId,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating user bet type payout rate:', result.error);
      return { data: null, error: result.error.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateUserBetTypePayoutRate:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Khôi phục về cài đặt mặc định (xóa cài đặt tùy chỉnh)
export async function resetUserBetTypeSettings(userId, betTypeId) {
  try {
    const { error } = await supabaseAdmin
      .from('user_bet_type_settings')
      .delete()
      .eq('user_id', userId)
      .eq('bet_type_id', betTypeId);

    if (error) {
      console.error('Error resetting user bet type settings:', error);
      return { data: null, error: error.message };
    }

    // Lấy giá trị mặc định từ bet_types
    const { data: betType, error: betTypeError } = await supabaseAdmin
      .from('bet_types')
      .select('payout_rate, multiplier')
      .eq('id', betTypeId)
      .single();

    if (betTypeError) {
      console.error('Error fetching bet type defaults:', betTypeError);
      return { data: null, error: betTypeError.message };
    }

    // Tạo lại setting với giá trị mặc định từ bet_types
    const { error: insertError } = await supabaseAdmin
      .from('user_bet_type_settings')
      .insert({
        user_id: userId,
        bet_type_id: betTypeId,
        is_active: true,
        payout_rate: null, // Sử dụng tỷ lệ mặc định
        multiplier: betType.multiplier, // Sử dụng hệ số nhân mặc định từ bet_types
        created_by: userId, // Using userId as the creator since we don't have adminId here
      });

    if (insertError) {
      console.error('Error creating default settings:', insertError);
      return { data: null, error: insertError.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in resetUserBetTypeSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Cập nhật hàng loạt cài đặt loại cược cho user
export async function batchUpdateUserBetTypeSettings(userId, adminId, updates) {
  try {
    // Process in batches to avoid too many concurrent operations
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const promises = batch.map((update) => {
        if (update.setting_id) {
          // Update existing record
          return supabaseAdmin
            .from('user_bet_type_settings')
            .update({
              is_active: update.is_active,
              payout_rate: update.payout_rate,
              updated_at: new Date().toISOString(),
            })
            .eq('id', update.setting_id);
        } else {
          // Create new record
          return supabaseAdmin.from('user_bet_type_settings').insert({
            user_id: userId,
            bet_type_id: update.bet_type_id,
            is_active: update.is_active,
            payout_rate: update.payout_rate,
            multiplier: update.multiplier || 1,
            created_by: adminId,
          });
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    // Check for any errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Errors during batch update:', errors);
      return {
        data: { success: false, errors },
        error: 'Some updates failed',
      };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in batchUpdateUserBetTypeSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}
