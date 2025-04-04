// src/app/actions/data.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchData(table, options = {}) {
  const supabase = await createClient();

  let query = supabase.from(table).select(options.select || '*');

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (key === 'in') {
        query = query.in(value.column, value.values);
      } else if (key === 'eq') {
        query = query.eq(value.column, value.value);
      } else if (key === 'or') {
        query = query.or(value);
      }
      // Add more conditions as needed
    }
  }

  if (options.order) {
    query = query.order(options.order.column, options.order.options);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.single) {
    const { data, error } = await query.single();
    return { data, error: error?.message };
  }

  const { data, error, count } = await query;

  return {
    data,
    error: error?.message,
    count,
  };
}

export async function insertData(table, data, options = {}) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();

  if (!error && options.revalidatePath) {
    revalidatePath(options.revalidatePath);
  }

  return {
    data: result,
    error: error?.message,
  };
}

export async function updateData(table, data, conditions, options = {}) {
  const supabase = await createClient();

  let query = supabase.from(table).update(data);

  for (const [column, value] of Object.entries(conditions)) {
    query = query.eq(column, value);
  }

  const { data: result, error } = await query.select();

  if (!error && options.revalidatePath) {
    revalidatePath(options.revalidatePath);
  }

  return {
    data: result,
    error: error?.message,
  };
}

export async function deleteData(table, conditions, options = {}) {
  const supabase = await createClient();

  let query = supabase.from(table).delete();

  for (const [column, value] of Object.entries(conditions)) {
    query = query.eq(column, value);
  }

  const { error } = await query;

  if (!error && options.revalidatePath) {
    revalidatePath(options.revalidatePath);
  }

  return {
    success: !error,
    error: error?.message,
  };
}
