import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Portal Quản Lý Đặt Cược Xổ Số',
  description: 'Hệ thống quản lý và theo dõi lượt đặt cược xổ số',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="light"
              expand={false}
              duration={4000}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
