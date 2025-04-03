'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart4,
  FileSpreadsheet,
  LogOut,
  Menu,
  ChevronDown,
  Database,
  Shield,
  Globe,
  FileText,
  Dice,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

// Header Component
const Header = ({ toggleSidebar, isMobile }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-xl"
          >
            <Shield className="h-6 w-6 text-primary" />
            <span>SoBet Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

// Theme Toggle Component
const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
};

// User Menu Component
const UserMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Avatar" />
            <AvatarFallback>SA</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Super Admin</p>
            <p className="text-xs leading-none text-muted-foreground">
              superadmin@sobet.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Tài khoản</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Cài đặt</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Sidebar Item Component
const SidebarItem = ({
  icon,
  label,
  href,
  isActive,
  isCollapsed,
  hasSubMenu,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = icon;

  if (hasSubMenu) {
    return (
      <div className={cn('overflow-hidden', isCollapsed && 'w-10')}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center w-full py-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-all',
            isActive ? 'bg-accent text-accent-foreground' : 'transparent',
            isCollapsed ? 'justify-center px-2' : 'px-3'
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                'h-5 w-5 shrink-0',
                isCollapsed ? 'mx-auto' : 'mr-2'
              )}
            />
          )}
          {!isCollapsed && (
            <>
              <span className="flex-grow text-left">{label}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
        {!isCollapsed && (
          <div
            className={cn(
              'pl-10 overflow-hidden transition-all',
              isOpen ? 'max-h-screen' : 'max-h-0'
            )}
          >
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={href} passHref>
      <span
        className={cn(
          'flex items-center py-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-all',
          isActive ? 'bg-accent text-accent-foreground' : 'transparent',
          isCollapsed ? 'justify-center px-2' : 'px-3'
        )}
      >
        {Icon && (
          <Icon
            className={cn('h-5 w-5 shrink-0', isCollapsed ? 'mx-auto' : 'mr-2')}
          />
        )}
        {!isCollapsed && <span>{label}</span>}
      </span>
    </Link>
  );
};

// Submenu Item Component
const SubMenuItem = ({ label, href, isActive }) => {
  return (
    <Link href={href} passHref>
      <span
        className={cn(
          'flex items-center py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-all px-3',
          isActive
            ? 'text-accent-foreground font-medium'
            : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </Link>
  );
};

// Sidebar Component
const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'h-screen bg-background border-r fixed left-0 top-0 bottom-0 z-30 flex flex-col transition-all duration-300 overflow-y-auto pb-10',
        isCollapsed ? 'w-[70px]' : 'w-[250px]'
      )}
    >
      <div className="flex h-16 items-center px-4 border-b justify-between">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Shield className="h-6 w-6 text-primary" />
            <span>SoBet</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className={cn('flex flex-col gap-1 p-2')}>
        <SidebarItem
          icon={LayoutDashboard}
          label="Tổng quan"
          href="/dashboard"
          isActive={pathname === '/dashboard'}
          isCollapsed={isCollapsed}
        />

        <SidebarItem
          icon={Users}
          label="Quản lý người dùng"
          isActive={pathname.startsWith('/users')}
          isCollapsed={isCollapsed}
          hasSubMenu
        >
          <SubMenuItem
            label="Danh sách Admin"
            href="/users/admins"
            isActive={pathname === '/users/admins'}
          />
          <SubMenuItem
            label="Danh sách User"
            href="/users/users"
            isActive={pathname === '/users/users'}
          />
          <SubMenuItem
            label="Phân quyền"
            href="/users/roles"
            isActive={pathname === '/users/roles'}
          />
        </SidebarItem>

        <SidebarItem
          icon={Globe}
          label="Khu vực & Đài"
          isActive={pathname.startsWith('/regions')}
          isCollapsed={isCollapsed}
          hasSubMenu
        >
          <SubMenuItem
            label="Quản lý Miền"
            href="/regions"
            isActive={pathname === '/regions'}
          />
          <SubMenuItem
            label="Quản lý Đài"
            href="/stations"
            isActive={pathname === '/stations'}
          />
          <SubMenuItem
            label="Lịch xổ số"
            href="/schedules"
            isActive={pathname === '/schedules'}
          />
        </SidebarItem>

        <SidebarItem
          icon={Dice}
          label="Loại cược"
          isActive={pathname.startsWith('/bet-types')}
          isCollapsed={isCollapsed}
          hasSubMenu
        >
          <SubMenuItem
            label="Danh sách loại cược"
            href="/bet-types"
            isActive={pathname === '/bet-types'}
          />
          <SubMenuItem
            label="Kết hợp số"
            href="/number-combinations"
            isActive={pathname === '/number-combinations'}
          />
        </SidebarItem>

        <SidebarItem
          icon={FileSpreadsheet}
          label="Kết quả xổ số"
          href="/lottery-results"
          isActive={pathname === '/lottery-results'}
          isCollapsed={isCollapsed}
        />

        <SidebarItem
          icon={FileText}
          label="Mã cược"
          href="/bet-codes"
          isActive={pathname === '/bet-codes'}
          isCollapsed={isCollapsed}
        />

        <Separator className="my-2" />

        <SidebarItem
          icon={Database}
          label="Đối soát dữ liệu"
          href="/verifications"
          isActive={pathname === '/verifications'}
          isCollapsed={isCollapsed}
        />

        <SidebarItem
          icon={BarChart4}
          label="Báo cáo & Thống kê"
          href="/reports"
          isActive={pathname === '/reports'}
          isCollapsed={isCollapsed}
        />

        <SidebarItem
          icon={Settings}
          label="Cài đặt hệ thống"
          href="/settings"
          isActive={pathname === '/settings'}
          isCollapsed={isCollapsed}
        />
      </div>

      <div className="mt-auto pt-4">
        <Separator />
        <div className="p-2">
          <SidebarItem
            icon={LogOut}
            label="Đăng xuất"
            href="/auth/logout"
            isCollapsed={isCollapsed}
          />
        </div>
      </div>
    </div>
  );
};

// Mobile Sidebar Component (For responsive design)
const MobileSidebar = ({ isOpen, setIsOpen }) => {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="p-0 w-72">
        <Sidebar isCollapsed={false} />
      </SheetContent>
    </Sheet>
  );
};

// Main Layout Component
const SuperAdminLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Effect to handle screen resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <MobileSidebar isOpen={isMobileOpen} setIsOpen={setIsMobileOpen} />
        )}

        <div
          className={cn(
            'flex flex-col flex-1 transition-all',
            !isMobile && (isCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[250px]')
          )}
        >
          <Header
            toggleSidebar={() => setIsMobileOpen(true)}
            isMobile={isMobile}
          />
          <main className="flex-1 container py-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SuperAdminLayout;
