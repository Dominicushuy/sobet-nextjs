'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useSupabaseQuery(key, queryFn, options = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => queryFn(supabase),
    ...options,
  });
}

export function useSupabaseMutation(key, mutationFn, options = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) => mutationFn(supabase, variables),
    onSuccess: (data, variables, context) => {
      // Invalidate queries that depend on this data
      if (options.invalidate) {
        const invalidateKeys = Array.isArray(options.invalidate)
          ? options.invalidate
          : [options.invalidate];

        invalidateKeys.forEach((invalidateKey) => {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(invalidateKey)
              ? invalidateKey
              : [invalidateKey],
          });
        });
      }

      // Call custom onSuccess if provided
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options,
  });
}
