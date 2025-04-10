// src/components/layouts/AdminLayout.jsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  FileText,
  Database,
  Shield,
  List,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function AdminLayout({ children }) {
  const { user, role, signOut, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Kiểm tra quyền truy cập một lần duy nhất sau khi loading hoàn tất
  useEffect(() => {
    if (!loading && !hasCheckedAuth) {
      setHasCheckedAuth(true);

      if (!user) {
        toast.error('Vui lòng đăng nhập để tiếp tục');
        router.replace('/login');
        return;
      }

      if (role !== 'admin' && role !== 'super_admin') {
        toast.error('Bạn không có quyền truy cập trang này');
        router.replace('/dashboard');
      }
    }
  }, [loading, user, role, router, hasCheckedAuth]);

  // Hàm xử lý đăng xuất
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Lỗi khi đăng xuất. Vui lòng thử lại.');
    } finally {
      setIsSigningOut(false);
    }
  };

  // Hiển thị loading khi đang kiểm tra
  if (loading || (user && !hasCheckedAuth)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Chỉ render nội dung khi đã kiểm tra quyền và user có quyền truy cập
  if (!user || (role !== 'admin' && role !== 'super_admin')) {
    return null; // Không render gì cả, sẽ chuyển hướng trong useEffect
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Function để kiểm tra xem một menu item có đang active hay không
  const isMenuItemActive = (href) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Danh sách liên kết trong sidebar
  const navLinks = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/admins',
      label: 'Quản lý Admin',
      icon: <Shield size={20} />,
      roles: ['super_admin'],
    },
    {
      href: '/admin/users',
      label: 'Quản lý User',
      icon: <Users size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/stations',
      label: 'Quản lý đài',
      icon: <Database size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/bet-types',
      label: 'Loại Cược',
      icon: <List size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/bet-codes',
      label: 'Mã cược',
      icon: <FileText size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/lottery-results',
      label: 'Kết quả xổ số',
      icon: <Ticket size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/statistics',
      label: 'Thống kê',
      icon: <BarChart3 size={20} />,
      roles: ['admin', 'super_admin'],
    },
    {
      href: '/admin/settings',
      label: 'Cài đặt',
      icon: <Settings size={20} />,
      roles: ['admin', 'super_admin'],
    },
  ];

  // Lọc các liên kết theo role
  const filteredNavLinks = navLinks.filter((link) => {
    return link.roles.includes(role);
  });

  return (
    <div className="flex h-screen w-full flex-col md:flex-row">
      {/* Sidebar cho desktop */}
      <div
        className={`hidden md:flex flex-col bg-card border-r overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex h-14 items-center border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </Button>
          {isSidebarOpen && <h1 className="font-semibold">Admin Portal</h1>}
        </div>

        <div className="flex-1 py-4">
          <nav className="grid gap-1 px-2">
            {filteredNavLinks.map((link) => {
              const isActive = isMenuItemActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  }`}
                >
                  <span
                    className={`${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`}
                  >
                    {link.icon}
                  </span>
                  {isSidebarOpen && <span>{link.label}</span>}
                  {!isSidebarOpen && isActive && (
                    <span className="absolute left-0 w-1 h-6 bg-primary rounded-r-md"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="text-sm">
                <div className="font-medium">{user?.email}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {role || 'admin'}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            {isSidebarOpen && <ThemeToggle />}
            <Button
              variant="destructive"
              size={isSidebarOpen ? 'default' : 'icon'}
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`${isSidebarOpen ? 'w-full' : 'ml-auto'}`}
            >
              {isSigningOut ? (
                <span className="flex items-center">
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isSidebarOpen && 'Đang đăng xuất...'}
                </span>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isSidebarOpen && 'Đăng xuất'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar cho mobile */}
      <div
        className={`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 w-64 bg-card p-4 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-14 items-center justify-between border-b mb-4">
            <h1 className="font-semibold">Admin Portal</h1>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          <nav className="grid gap-1">
            {filteredNavLinks.map((link) => {
              const isActive = isMenuItemActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span
                    className={`${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{user?.email}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {role || 'admin'}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <span className="flex items-center">
                    <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang đăng xuất...
                  </span>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <div className="font-semibold md:hidden">Admin Portal</div>
            <div className="hidden md:block">
              {isSuperAdmin && <Badge>Super Admin</Badge>}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle className="hidden md:flex" />
              <Avatar className="md:hidden h-8 w-8">
                <AvatarFallback>
                  {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Badge Component
function Badge({ children, className }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground ${className}`}
    >
      {children}
    </span>
  );
}
