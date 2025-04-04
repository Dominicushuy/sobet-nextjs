// src/hooks/useServerAction.js
'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useServerQuery(key, serverAction, options = {}) {
  const fetchData = useCallback(async () => {
    try {
      const result = await serverAction();

      // Check and handle errors
      if (result.error) {
        console.error(
          `Query error [${Array.isArray(key) ? key.join(',') : key}]:`,
          result.error
        );
        throw new Error(result.error);
      }

      // Return the entire result object
      return result;
    } catch (error) {
      console.error(
        `Query exception [${Array.isArray(key) ? key.join(',') : key}]:`,
        error
      );
      throw error;
    }
  }, [serverAction, key]);

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
      try {
        const result = await serverAction(variables);

        if (result.error) {
          console.error(`Mutation error [${key}]:`, result.error);
          throw new Error(result.error);
        }

        // Return the entire result object
        return result;
      } catch (error) {
        console.error(`Mutation exception [${key}]:`, error);
        throw error;
      }
    },
    [serverAction, key]
  );

  return useMutation({
    mutationFn: mutate,
    onSuccess: (result, variables, context) => {
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
        options.onSuccess(result, variables, context);
      }
    },
    ...options,
  });
}
