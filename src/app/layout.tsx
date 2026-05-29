import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '图片转矢量格式工具',
    template: '%s | 图片转矢量格式工具',
  },
  description:
    '将JPEG、JPG、PNG格式的位图转换为SVG或AI矢量格式。支持无损缩放，适用于Logo设计、图标制作、印刷品等专业场景。',
  keywords: [
    '图片转换',
    '矢量图',
    'SVG转换',
    'AI转换',
    '位图转矢量',
    '图片矢量化',
    '格式转换工具',
  ],
  authors: [{ name: 'Image Vectorizer Team' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}