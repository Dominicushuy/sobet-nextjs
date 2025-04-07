// src/app/(private)/layout.jsx

'use client';

import { useAuth } from '@/providers/AuthProvider';
import AdminLayout from '@/components/layouts/AdminLayout';
import UserLayout from '@/components/layouts/UserLayout';

export default function PrivateLayout({ children }) {
  const { isAdmin, isSuperAdmin } = useAuth();

  // Nếu là admin hoặc super_admin, sử dụng AdminLayout
  if (isAdmin || isSuperAdmin) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Ngược lại sử dụng UserLayout cho người dùng thông thường
  return <UserLayout>{children}</UserLayout>;
}
