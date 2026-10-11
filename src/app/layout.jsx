import '../style.css';
import '../refinements.css';
export const metadata = {
  title: 'артблять — квиз и экзамен по искусству',
  description: 'Изучай коллекцию, выбирай ответы в квизе и вспоминай автора и название на экзамене.',
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
