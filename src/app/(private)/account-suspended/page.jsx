// src/app/(private)/account-suspended/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LockIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function AccountSuspended() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất: ' + error.message);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-md p-6 text-center rounded-lg border bg-card shadow-sm">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <LockIcon className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Tài khoản đã bị khóa</h1>
        <p className="mb-6 text-muted-foreground">
          Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ
          với quản trị viên để được hỗ trợ.
        </p>
        <Button
          onClick={handleSignOut}
          variant="destructive"
          disabled={isSigningOut}
          className="w-full"
        >
          {isSigningOut ? (
            <span className="flex items-center">
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang đăng xuất...
            </span>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
