// src/hooks/useServerAction.js
'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useServerQuery(key, serverAction, options = {}) {
  const fetchData = useCallback(async () => {
    try {
      const result = await serverAction();

      // Kiểm tra và xử lý lỗi
      if (result.error) {
        console.error(
          `Query error [${Array.isArray(key) ? key.join(',') : key}]:`,
          result.error
        );
        throw new Error(result.error);
      }

      // Đảm bảo data được trả về, nếu không có thì trả về mảng rỗng hoặc giá trị mặc định
      if (result.data === undefined || result.data === null) {
        return options.defaultData || [];
      }

      return result.data;
    } catch (error) {
      console.error(
        `Query exception [${Array.isArray(key) ? key.join(',') : key}]:`,
        error
      );
      throw error;
    }
  }, [serverAction, key, options.defaultData]);

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

        // Nếu success = true nhưng không có data, trả về một object đơn giản
        if (result.success && result.data === undefined) {
          return { success: true };
        }

        return result.data || { success: true };
      } catch (error) {
        console.error(`Mutation exception [${key}]:`, error);
        throw error;
      }
    },
    [serverAction, key]
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
