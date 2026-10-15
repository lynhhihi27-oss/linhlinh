import './globals.css';

export const metadata = {
  title: 'YouTube Xu - Xem Video Nhận Xu Đổi Thưởng',
  description: 'Hệ thống nền tảng xem quảng cáo YouTube nhận xu tích lũy, đổi thẻ điện thoại và voucher (Sprint 1 MVP).'
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
