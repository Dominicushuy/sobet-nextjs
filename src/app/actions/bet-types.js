// src/app/actions/bet-types.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Fetch all bet types (for Super Admin)
export async function fetchAllBetTypes() {
  try {
    const { data: betTypes, error } = await supabaseAdmin
      .from('bet_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching bet types:', error);
      return { data: null, error: error.message };
    }

    return { data: betTypes, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchAllBetTypes:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Fetch active bet types only (for Admin and User)
export async function fetchActiveBetTypes() {
  try {
    const supabase = await createClient();

    const { data: betTypes, error } = await supabase
      .from('bet_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching active bet types:', error);
      return { data: null, error: error.message };
    }

    return { data: betTypes, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchActiveBetTypes:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Fetch all number combinations
export async function fetchAllNumberCombinations() {
  try {
    const supabase = await createClient();

    const { data: combinations, error } = await supabase
      .from('number_combinations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching number combinations:', error);
      return { data: null, error: error.message };
    }

    return { data: combinations, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchAllNumberCombinations:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Toggle bet type status (activate/deactivate)
export async function toggleBetTypeStatus(id, isActive) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bet_types')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling bet type status:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-types');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in toggleBetTypeStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update bet type
export async function updateBetType(id, betTypeData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bet_types')
      .update(betTypeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet type:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-types');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateBetType:', error);
    return { data: null, error: 'Internal server error' };
  }
}
