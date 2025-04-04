// src/middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  // Trả về response ngay để không làm thay đổi request
  const res = NextResponse.next({
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
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Kiểm tra phiên
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Các path không yêu cầu xác thực
  const publicPaths = [
    '/login',
    '/auth',
    '/account-suspended',
    '/api',
    '/_next',
    '/favicon.ico',
  ];

  const isPublicPath =
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path)
    ) || pathname.includes('.');

  // Nếu không có session và đang cố truy cập các trang được bảo vệ
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Kiểm tra trạng thái tài khoản nếu người dùng đã đăng nhập
  if (user && !isPublicPath && pathname !== '/account-suspended') {
    // Lấy thông tin user từ DB
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .single();

    // Nếu tài khoản bị khóa, chuyển hướng đến trang thông báo
    if (!error && userData && !userData.is_active) {
      return NextResponse.redirect(new URL('/account-suspended', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
