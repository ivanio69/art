import '../style.css';
export const metadata = {
  title: 'Артпамять — картины, которые ты помнишь',
  description: 'Учите названия 170 произведений и их авторов: короткие тренировки, карточки и интервальное повторение.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f6f2',
};
export default function RootLayout({ children }) {
  return <html lang="ru"><body>{children}</body></html>;
}
