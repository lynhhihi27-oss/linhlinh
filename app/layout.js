import './globals.css';

export const metadata = {
  title: 'YouTube Xu - Quản lý chiến dịch và đổi quà',
  description: 'Quản lý chiến dịch quảng cáo, ví Xu và yêu cầu đổi quà trên nền tảng YouTube Xu.'
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
