// src/middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Đường dẫn công khai (không cần đăng nhập)
const publicPaths = ['/login', '/api/auth/user', '/api/'];

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
  let supabaseResponse = NextResponse.next();

  // Tạo Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Kiểm tra phiên đăng nhập
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nếu không có phiên và đường dẫn không công khai, chuyển hướng đến trang đăng nhập
  if (!user && !isPublicPath) {
    console.log('No session, redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Nếu đã đăng nhập và đang truy cập trang đăng nhập, chuyển hướng đến trang chủ
  if (user && pathname === '/login') {
    console.log('User logged in, redirecting from login');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Kiểm tra quyền truy cập vào các đường dẫn admin
  if (user && pathname.startsWith('/admin')) {
    try {
      // Lấy thông tin role của người dùng
      const { data: userData, error } = await supabase
        .from('users')
        .select('roles:roles(name)')
        .eq('id', user.id)
        .single();

      console.log('Middleware role check:', { userData, error });

      if (error || !userData) {
        // Nếu có lỗi hoặc không tìm thấy người dùng, hủy phiên và chuyển hướng
        console.log('User data fetch error in middleware');
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const roleName = userData.roles.name;

      // Chỉ cho phép admin/super_admin truy cập đường dẫn admin
      if (
        pathname.startsWith('/admin') &&
        !['admin', 'super_admin'].includes(roleName)
      ) {
        console.log('Access denied to admin path');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
