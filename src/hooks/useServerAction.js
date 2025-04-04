// src/hooks/useServerAction.js
'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useServerQuery(key, serverAction, options = {}) {
  const fetchData = useCallback(async () => {
    const result = await serverAction();

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data;
  }, [serverAction]);

  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fetchData,
    ...options,
  });
}

export function useServerMutation(key, serverAction, options = {}) {
  const queryClient = useQueryClient();

  const mutate = useCallback(
    async (variables) => {
      const result = await serverAction(variables);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    [serverAction]
  );

  return useMutation({
    mutationFn: mutate,
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
