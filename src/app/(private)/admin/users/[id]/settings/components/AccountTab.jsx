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
import { RefreshCw } from 'lucide-react';

import { useServerMutation } from '@/hooks/useServerAction';
import {
  updateUserProfile,
  resetUserPassword,
} from '@/app/actions/user-settings';

// Form schemas
const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự'),
    confirmPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function AccountTab({ user, userId }) {
  // User profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
    },
  });

  // Reset password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile form when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.full_name || '',
      });
    }
  }, [user, profileForm]);

  // Update profile mutation
  const updateProfileMutation = useServerMutation(
    'updateUserProfile',
    (data) => updateUserProfile(userId, data),
    {
      onSuccess: () => {
        toast.success('Thông tin người dùng đã được cập nhật');
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật thông tin: ' + error.message);
      },
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useServerMutation(
    'resetUserPassword',
    (data) => resetUserPassword(userId, data),
    {
      onSuccess: () => {
        toast.success('Mật khẩu đã được khôi phục thành công');
        passwordForm.reset();
      },
      onError: (error) => {
        toast.error('Lỗi khi khôi phục mật khẩu: ' + error.message);
      },
    }
  );

  // Handle profile form submission
  const onSubmitProfile = (data) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password form submission
  const onSubmitPassword = (data) => {
    resetPasswordMutation.mutate(data.newPassword);
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>
            Chỉnh sửa thông tin cơ bản của tài khoản người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              className="space-y-4"
            >
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đầy đủ</FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid w-full items-center gap-1.5">
                <FormLabel>Tên đăng nhập</FormLabel>
                <Input value={user?.username || ''} disabled />
                <p className="text-sm text-muted-foreground">
                  Tên đăng nhập không thể thay đổi
                </p>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <FormLabel>Email</FormLabel>
                <Input value={user?.email || ''} disabled />
                <p className="text-sm text-muted-foreground">
                  Email được tạo tự động và không thể thay đổi
                </p>
              </div>

              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Reset Password */}
      <Card>
        <CardHeader>
          <CardTitle>Khôi phục mật khẩu</CardTitle>
          <CardDescription>
            Thiết lập mật khẩu mới cho tài khoản người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Đang khôi phục...
                  </>
                ) : (
                  'Khôi phục mật khẩu'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
