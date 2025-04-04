import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  // Trả về response ngay để không làm thay đổi request
  const res = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Chỉ xử lý cookies và không thêm bất kỳ logic chuyển hướng nào
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

  // Đơn giản là kiểm tra session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nếu không có session và đang cố truy cập các trang được bảo vệ
  if (!user) {
    const { pathname } = request.nextUrl;

    // Nếu đang truy cập vào các trang cần đăng nhập
    if (
      pathname !== '/login' &&
      !pathname.startsWith('/auth') &&
      !pathname.startsWith('/_next') &&
      !pathname.includes('.')
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
