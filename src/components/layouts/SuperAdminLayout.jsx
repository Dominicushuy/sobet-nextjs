'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import AdminLayout from './AdminLayout';

export default function SuperAdminLayout({ children }) {
  const { role, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Kiểm tra nếu role không phải super_admin, hiển thị thông báo lỗi
  if (role !== 'super_admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">
          Chỉ Super Admin mới có thể truy cập
        </h1>
        <p>Bạn cần có quyền Super Admin để truy cập trang này.</p>
      </div>
    );
  }

  // Sử dụng AdminLayout làm cơ sở nhưng với quyền kiểm soát riêng
  return <AdminLayout>{children}</AdminLayout>;
}
