// src/middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Đường dẫn công khai (không cần đăng nhập)
const publicPaths = ['/', '/login', '/api/auth/user', '/api/'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Bỏ qua các assets tĩnh
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Kiểm tra xem đường dẫn có phải là công khai không
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Tạo response mới để quản lý cookies
  const response = NextResponse.next();

  // Tạo Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // Khi cookie được thiết lập, cập nhật cả request và response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Kiểm tra phiên đăng nhập
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Nếu không có phiên và đường dẫn không công khai, chuyển hướng đến trang đăng nhập
  if (!session?.user && !isPublicPath) {
    console.log('No session, redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Đặc biệt xử lý trang / - redirect về dashboard nếu đã đăng nhập
  if (pathname === '/' && session?.user) {
    // Check role để quyết định redirect tới admin hay user dashboard
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('roles:roles(name)')
        .eq('id', session.user.id)
        .single();

      if (userData && ['admin', 'super_admin'].includes(userData.roles.name)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // Nếu lỗi, mặc định redirect tới /dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Nếu đã đăng nhập và đang truy cập trang đăng nhập, chuyển hướng đến trang chủ
  if (session?.user && pathname === '/login') {
    console.log('User logged in, redirecting from login');
    // Kiểm tra role để biết redirect tới đâu
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('roles:roles(name)')
        .eq('id', session.user.id)
        .single();

      if (userData && ['admin', 'super_admin'].includes(userData.roles.name)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // Nếu lỗi, mặc định redirect tới /dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Kiểm tra quyền truy cập vào các đường dẫn admin
  if (session?.user && pathname.startsWith('/admin')) {
    try {
      // Lấy thông tin role của người dùng
      const { data: userData, error } = await supabase
        .from('users')
        .select('roles:roles(name)')
        .eq('id', session.user.id)
        .single();

      if (error || !userData) {
        // Nếu có lỗi hoặc không tìm thấy người dùng, chuyển hướng đến dashboard
        console.log('User data fetch error in middleware');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const roleName = userData.roles.name;

      // Chỉ cho phép admin/super_admin truy cập đường dẫn admin
      if (!['admin', 'super_admin'].includes(roleName)) {
        console.log('Access denied to admin path');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
