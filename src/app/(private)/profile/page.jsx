// src/app/(private)/profile/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  User,
  Settings,
  CreditCard,
  Info,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { getUserProfile } from '@/app/actions/profile';

import PersonalInfo from './components/PersonalInfo';
import ChangePasswordForm from './components/ChangePasswordForm';
import CommissionInfo from './components/CommissionInfo';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  // Nếu không phải user, chuyển hướng về dashboard
  useEffect(() => {
    if (!authUser) {
      router.push('/login');
    } else if (isAdmin || isSuperAdmin) {
      router.push('/admin/dashboard');
    }
  }, [authUser, isAdmin, isSuperAdmin, router]);

  // Fetch user profile
  const {
    data: userData,
    isLoading,
    error,
  } = useServerQuery(
    ['profile', authUser?.id],
    () => getUserProfile(authUser?.id),
    {
      enabled: !!authUser?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin cá nhân: ' + error.message);
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  if (!userData?.data && !isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không thể tải thông tin cá nhân. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          Quay lại Dashboard
        </Button>
      </div>
    );
  }

  const user = userData?.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
        <p className="text-muted-foreground">
          Quản lý thông tin cá nhân và cài đặt tài khoản của bạn
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Thông tin cá nhân
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Đổi mật khẩu
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Tỉ lệ hoa hồng
          </TabsTrigger>
        </TabsList>

        {/* Thông tin cá nhân */}
        <TabsContent value="info">
          <PersonalInfo user={user} />
        </TabsContent>

        {/* Đổi mật khẩu */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>
                Cập nhật mật khẩu để bảo vệ tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tỉ lệ hoa hồng */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>Tỉ lệ hoa hồng</CardTitle>
              <CardDescription>
                Thông tin tỉ lệ hoa hồng của tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionInfo userId={user.id} />
            </CardContent>
            <CardFooter className="border-t pt-6 flex flex-col items-start">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Các tỉ lệ này được thiết lập bởi quản trị viên của bạn. Vui
                  lòng liên hệ với họ nếu bạn cần thay đổi.
                </p>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
