// src/app/actions/user-commission.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Get user commission settings
export async function getUserCommissionSettings(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_commission_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows returned
      console.error('Error fetching user commission settings:', error);
      return { data: null, error: error.message };
    }

    // If no settings found, return default values
    if (!data) {
      return {
        data: {
          price_rate: 0.8,
          export_price_rate: 0.74,
          return_price_rate: 0.95,
          user_id: userId,
          id: null,
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in getUserCommissionSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update user commission settings
export async function updateUserCommissionSettings(userId, adminId, settings) {
  try {
    const { price_rate, export_price_rate, return_price_rate } = settings;

    // Check if settings already exist
    const { data: existingSettings } = await supabaseAdmin
      .from('user_commission_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;

    if (existingSettings) {
      // Update existing settings
      result = await supabaseAdmin
        .from('user_commission_settings')
        .update({
          price_rate,
          export_price_rate,
          return_price_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings
      result = await supabaseAdmin
        .from('user_commission_settings')
        .insert({
          user_id: userId,
          price_rate,
          export_price_rate,
          return_price_rate,
          created_by: adminId,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating user commission settings:', result.error);
      return { data: null, error: result.error.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateUserCommissionSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Reset user commission settings to default
export async function resetUserCommissionSettings(userId) {
  try {
    const { error } = await supabaseAdmin
      .from('user_commission_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting user commission settings:', error);
      return { data: null, error: error.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return {
      data: {
        price_rate: 0.8,
        export_price_rate: 0.74,
        return_price_rate: 0.95,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in resetUserCommissionSettings:', error);
    return { data: null, error: 'Internal server error' };
  }
}
