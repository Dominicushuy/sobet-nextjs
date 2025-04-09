'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, RotateCcw, Save, Info } from 'lucide-react';

import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  getUserCommissionSettings,
  updateUserCommissionSettings,
  resetUserCommissionSettings,
} from '@/app/actions/user-commission';

// Form schema for commission settings
const commissionSchema = z.object({
  price_rate: z.string().refine(
    (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1;
    },
    {
      message: 'Tỉ lệ nhân cho khách phải là số từ 0 đến 1',
    }
  ),
  export_price_rate: z.string().refine(
    (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1;
    },
    {
      message: 'Tỉ lệ nhân khi thu phải là số từ 0 đến 1',
    }
  ),
  return_price_rate: z.string().refine(
    (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1;
    },
    {
      message: 'Tỉ lệ hồi khi thu phải là số từ 0 đến 1',
    }
  ),
});

export default function CommissionTab({ userId, currentUser }) {
  // Form setup
  const form = useForm({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      price_rate: '0.8',
      export_price_rate: '0.74',
      return_price_rate: '0.95',
    },
  });

  // Fetch commission settings
  const {
    data: commissionData,
    isLoading,
    refetch,
  } = useServerQuery(
    ['userCommission', userId],
    () => getUserCommissionSettings(userId),
    {
      enabled: !!userId,
      onError: (error) => {
        toast.error('Lỗi khi tải cài đặt tỉ lệ: ' + error.message);
      },
    }
  );

  // Update form values when data is loaded
  useEffect(() => {
    if (commissionData?.data) {
      form.reset({
        price_rate: commissionData.data.price_rate.toString(),
        export_price_rate: commissionData.data.export_price_rate.toString(),
        return_price_rate: commissionData.data.return_price_rate.toString(),
      });
    }
  }, [commissionData, form]);

  // Update commission settings mutation
  const updateCommissionMutation = useServerMutation(
    'updateUserCommissionSettings',
    (data) => updateUserCommissionSettings(userId, currentUser?.id, data),
    {
      onSuccess: () => {
        toast.success('Cài đặt tỉ lệ đã được cập nhật');
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật cài đặt tỉ lệ: ' + error.message);
      },
    }
  );

  // Reset commission settings mutation
  const resetCommissionMutation = useServerMutation(
    'resetUserCommissionSettings',
    () => resetUserCommissionSettings(userId),
    {
      onSuccess: () => {
        toast.success('Đã khôi phục về cài đặt mặc định');
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi khôi phục cài đặt mặc định: ' + error.message);
      },
    }
  );

  // Handle form submission
  const onSubmit = (data) => {
    updateCommissionMutation.mutate({
      price_rate: parseFloat(data.price_rate),
      export_price_rate: parseFloat(data.export_price_rate),
      return_price_rate: parseFloat(data.return_price_rate),
    });
  };

  // Handle reset to default values
  const handleReset = () => {
    resetCommissionMutation.mutate();
  };

  // Format percentage for display
  const formatPercent = (value) => {
    return `${(parseFloat(value) * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt tỉ lệ</CardTitle>
        <CardDescription>
          Quản lý các tỉ lệ hoa hồng và giá cho người dùng này
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Đang tải cài đặt...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Alert className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Info className="h-4 w-4" />
                <AlertTitle>Hướng dẫn</AlertTitle>
                <AlertDescription>
                  Các tỉ lệ được nhập dưới dạng số thập phân từ 0 đến 1. Ví dụ:
                  0.8 tương đương với 80%.
                </AlertDescription>
              </Alert>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="price_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tỉ lệ nhân cho khách</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? formatPercent(field.value) : '80%'}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="export_price_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tỉ lệ nhân khi thu</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? formatPercent(field.value) : '74%'}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="return_price_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tỉ lệ hồi khi thu</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? formatPercent(field.value) : '95%'}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />

              <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetCommissionMutation.isPending}
                >
                  {resetCommissionMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Đang khôi phục...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Khôi phục mặc định
                    </>
                  )}
                </Button>

                <Button
                  type="submit"
                  disabled={updateCommissionMutation.isPending}
                >
                  {updateCommissionMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="text-sm text-muted-foreground">
          <p>
            Giá trị mặc định: Tỉ lệ nhân cho khách: 80%, Tỉ lệ nhân khi thu:
            74%, Tỉ lệ hồi khi thu: 95%
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
