'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Database,
  BarChart,
  Settings,
  User,
  Menu,
  X,
  LogOut,
  Monitor,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Navigation items for admin role
const navItems = [
  {
    title: 'Tổng quan',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Người dùng',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Mã cược',
    href: '/admin/bet-codes',
    icon: FileText,
  },
  {
    title: 'Kết quả xổ số',
    href: '/admin/lottery-results',
    icon: Database,
  },
  {
    title: 'Thống kê',
    href: '/admin/stats',
    icon: BarChart,
  },
  {
    title: 'Theo dõi',
    href: '/admin/monitoring',
    icon: Monitor,
  },
  {
    title: 'Cài đặt',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, role, signOut, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Kiểm tra nếu role không phải admin hoặc super_admin, không hiển thị giao diện
  if (!user || (role !== 'admin' && role !== 'super_admin')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Không có quyền truy cập</h1>
        <p className="mb-4">Bạn không có quyền truy cập vào trang này</p>
        <Button onClick={signOut}>Đăng xuất</Button>
      </div>
    );
  }

  // Lấy chữ cái đầu tiên của tên hoặc email người dùng
  const getInitials = () => {
    if (!user) return '?';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background px-4">
        <div className="flex flex-1 items-center justify-between">
          {/* Logo và toggle menu di động */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-2"
            >
              <span className="text-xl font-bold">SoBet</span>
              {role === 'super_admin' && (
                <span className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                  Super Admin
                </span>
              )}
            </Link>
          </div>

          {/* User dropdown */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Hồ sơ</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Cài đặt</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-20 mt-16 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0',
            {
              'translate-x-0': isMobileMenuOpen,
              '-translate-x-full': !isMobileMenuOpen,
            }
          )}
        >
          <nav className="flex flex-col gap-2 p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn('w-full justify-start', {
                      'bg-primary text-primary-foreground': isActive,
                    })}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Đăng xuất
            </Button>
          </nav>
        </aside>

        {/* Overlay cho mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:ml-64">{children}</main>
      </div>
    </div>
  );
}
