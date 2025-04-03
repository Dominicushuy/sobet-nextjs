import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Đường dẫn công khai (không cần đăng nhập)
const publicPaths = ['/login', '/api/'];

// Đường dẫn admin/super_admin
const adminPaths = ['/admin'];

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

  // Tạo một response mới để ghi cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.delete({
            name,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete({
            name,
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
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Nếu đã đăng nhập và đang truy cập trang đăng nhập, chuyển hướng đến trang chủ
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Kiểm tra quyền truy cập vào các đường dẫn admin
  if (session && pathname.startsWith('/admin')) {
    try {
      // Lấy thông tin role của người dùng
      const { data: userData, error } = await supabase
        .from('users')
        .select('roles:roles(name)')
        .eq('id', session.user.id)
        .single();

      if (error || !userData) {
        // Nếu có lỗi hoặc không tìm thấy người dùng, hủy phiên và chuyển hướng
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const roleName = userData.roles.name;

      // Chỉ cho phép admin/super_admin truy cập đường dẫn admin
      if (
        pathname.startsWith('/admin') &&
        !['admin', 'super_admin'].includes(roleName)
      ) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
