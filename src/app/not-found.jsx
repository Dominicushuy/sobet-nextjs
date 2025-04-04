// src/app/not-found.jsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-9xl font-extrabold text-primary">404</h1>
        <h2 className="mb-6 text-2xl font-bold">Trang không tồn tại</h2>
        <p className="mb-6 text-muted-foreground">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link href="/">
          <Button>Quay lại trang chủ</Button>
        </Link>
      </div>
    </div>
  );
}
