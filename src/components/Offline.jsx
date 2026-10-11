import { useEffect, useState } from 'react';
import imageStats from '../lib/image-stats.json';

export default function Offline({ images }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [install, setInstall] = useState(null);
  useEffect(() => {
    const offer = event => { event.preventDefault(); setInstall(event); };
    window.addEventListener('beforeinstallprompt', offer);
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', offer);
  }, []);
  async function saveOffline() {
    setBusy(true); setStatus('Сохраняю изображения…');
    try {
      if (!('serviceWorker' in navigator) || location.protocol === 'file:' || process.env.NODE_ENV !== 'production') throw new Error('Офлайн-сохранение доступно на опубликованном сайте. Отдельный HTML уже работает без сети.');
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      const urls = [...new Set(['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', ...images, ...performance.getEntriesByType('resource').map(r => r.name).filter(url => new URL(url, location.href).pathname.startsWith('/_next/static/'))])];
      await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => reject(new Error('Сохранение не завершилось. Проверь подключение и попробуй снова.')), 180000);
        channel.port1.onmessage = ({ data }) => {
          if (data.progress) setStatus(`Сохранено ${data.progress} / ${urls.length}`);
          if (data.done) { clearTimeout(timeout); channel.port1.close(); data.failed ? reject(new Error(`Не сохранилось файлов: ${data.failed}. Повтори сохранение при стабильной сети.`)) : resolve(); }
        };
        registration.active.postMessage({ type: 'SAVE_OFFLINE', urls }, [channel.port2]);
      });
      setStatus('Готово. Эта коллекция доступна без сети.');
    } catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }
  return <div className="offline-settings"><button className="text-button" disabled={busy} onClick={saveOffline}>{busy ? 'Сохраняю…' : `Сохранить коллекцию офлайн · ~${Math.ceil(imageStats.totalBytes / 1048576)} МБ`}</button>{install ? <button className="text-button" onClick={async () => { await install.prompt(); setInstall(null); }}>Установить на телефон</button> : <small>На телефоне: меню браузера → «На экран Домой».</small>}{status && <small role="status">{status}</small>}</div>;
}
