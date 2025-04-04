// src/app/login/page.jsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { signIn } from '@/app/actions/auth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values) {
    try {
      setIsLoading(true);
      setLoginError('');

      console.log('Submitting login with:', values.email);

      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);

      // Thực hiện đăng nhập
      const result = await signIn(formData);
      console.log('Login result:', result);

      if (result.error) {
        setLoginError(result.error);
        toast.error('Đăng nhập thất bại', {
          description: result.error,
        });
        return;
      }

      // Nếu đăng nhập thành công
      const userData = result.data;
      if (!userData || !userData.role) {
        setLoginError('Không thể lấy thông tin người dùng');
        toast.error('Đăng nhập thất bại', {
          description: 'Không thể lấy thông tin người dùng',
        });
        return;
      }

      toast.success('Đăng nhập thành công');
      console.log('Login successful, role:', userData.role);

      // Thêm timeout để đảm bảo toast hiển thị trước khi chuyển trang
      setTimeout(() => {
        // Chuyển hướng dựa vào role
        if (userData.role === 'super_admin' || userData.role === 'admin') {
          console.log('Redirecting to admin dashboard...');
          window.location.href = '/admin/dashboard';
        } else {
          console.log('Redirecting to user dashboard...');
          window.location.href = '/dashboard';
        }
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Đã xảy ra lỗi không xác định');
      toast.error('Đã xảy ra lỗi', {
        description:
          error.message || 'Không thể đăng nhập, vui lòng thử lại sau.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Đăng nhập
          </CardTitle>
          <CardDescription className="text-center">
            Nhập thông tin đăng nhập của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your.email@example.com"
                        type="email"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-gray-500">
            Bạn chưa có tài khoản? Vui lòng liên hệ quản trị viên
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
