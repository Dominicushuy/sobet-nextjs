// src/app/(private)/admin/users/[id]/settings/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Info } from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { getUserDetails } from '@/app/actions/user-settings';

// Tabs Components
import AccountTab from './components/AccountTab';
import StationsTab from './components/StationsTab';
import BetTypesTab from './components/BetTypesTab';
import { RewardsTab, MultipliersTab } from './components/PlaceholderTabs'; // Placeholder tabs for future use

export default function UserSettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  // If not admin or super admin, redirect to login
  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      router.push('/login');
    }
  }, [isAdmin, isSuperAdmin, router]);

  // Fetch user details
  const { data: userData, isLoading: isLoadingUser } = useServerQuery(
    ['user', id],
    () => getUserDetails(id),
    {
      enabled: !!id,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin người dùng: ' + error.message);
      },
    }
  );

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  // No user found
  if (!userData?.data) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không tìm thấy thông tin người dùng hoặc bạn không có quyền truy
            cập.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push('/admin/users')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const user = userData.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/users')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
            <p className="text-muted-foreground">
              Quản lý cài đặt cho tài khoản {user.username || user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Badge variant={user.is_active ? 'default' : 'destructive'}>
            {user.is_active ? 'Đang hoạt động' : 'Đã khóa'}
          </Badge>
        </div>
      </div>

      <Tabs
        defaultValue="account"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">Thông tin tài khoản</TabsTrigger>
          <TabsTrigger value="stations">Cài đặt đài xổ số</TabsTrigger>
          <TabsTrigger value="betTypes">Cài đặt loại cược</TabsTrigger>
          <TabsTrigger value="rewards">Hệ số tính thưởng</TabsTrigger>
          <TabsTrigger value="multipliers">Hệ số nhân</TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account">
          <AccountTab user={user} userId={id} />
        </TabsContent>

        {/* Station Settings Tab */}
        <TabsContent value="stations">
          <StationsTab userId={id} currentUser={currentUser} />
        </TabsContent>

        {/* Bet Types Settings Tab */}
        <TabsContent value="betTypes">
          <BetTypesTab userId={id} currentUser={currentUser} />
        </TabsContent>

        {/* Placeholder Tabs */}
        <TabsContent value="rewards">
          <RewardsTab />
        </TabsContent>

        <TabsContent value="multipliers">
          <MultipliersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
