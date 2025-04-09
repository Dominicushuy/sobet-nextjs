// src/app/(private)/profile/components/PersonalInfo.jsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useServerMutation } from '@/hooks/useServerAction';
import { updateUserProfile } from '@/app/actions/profile';
import { RefreshCw, Save } from 'lucide-react';
import { format } from 'date-fns';

// Form schema cho cập nhật thông tin cá nhân
const personalInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

export default function PersonalInfo({ user }) {
  // Form setup
  const form = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.full_name || '',
      });
    }
  }, [user, form]);

  // Update profile mutation
  const updateProfileMutation = useServerMutation(
    'updateUserProfile',
    (data) => updateUserProfile(user.id, data),
    {
      onSuccess: () => {
        toast.success('Thông tin cá nhân đã được cập nhật');
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật thông tin: ' + error.message);
      },
    }
  );

  // Handle form submission
  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tên đăng nhập</Label>
                <div className="mt-1 font-medium">{user.username}</div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="mt-1 font-medium">{user.email}</div>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <div className="mt-1">
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Đang hoạt động' : 'Bị khóa'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ngày tạo tài khoản</Label>
                <div className="mt-1 font-medium">
                  {user.created_at
                    ? format(new Date(user.created_at), 'dd/MM/yyyy')
                    : '-'}
                </div>
              </div>
              <div>
                <Label>Vai trò</Label>
                <div className="mt-1 font-medium capitalize">
                  {user.roles?.name || 'Người dùng'}
                </div>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đầy đủ</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên đầy đủ của bạn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
