'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Flame, Grid2X2, Play, Search, Settings2, Type } from 'lucide-react';
import collection from './lib/collection.json';
import imageManifest from './lib/images.json';
import { localDay, makeQueue, ready, review } from './lib/learning.js';
import { STORAGE_KEY, downloadJson } from './lib/storage.js';
import { normalize } from './lib/matching.js';
import PaintingImage from './components/PaintingImage.jsx';
import Modal from './components/Modal.jsx';
import Session from './components/Session.jsx';

const defaults = { count: 10, dailyGoal: 10, tolerance: 'normal', filter: 'all' };
function initialData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1 && stored.progress && !Array.isArray(stored.progress)) {
      const settings = { ...defaults, ...stored.settings };
      if (![10, 20, 30, 'all'].includes(settings.count)) settings.count = 10;
      if (!['all', 'smart', 'mistakes', 'new'].includes(settings.filter)) settings.filter = 'all';
      return { ...stored, settings };
    }
  } catch {}
  return { progress: {}, activity: {}, settings: defaults };
}

export default function App() {
  const [data, setData] = useState(initialData);
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('home');
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [onlyImages, setOnlyImages] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [toast, setToast] = useState('');
  const gallery = useMemo(() => collection.map(p => ({ ...p, image: p.image?.startsWith('data:') ? p.image : imageManifest[p.id] || p.image })), []);
  const paintings = useMemo(() => gallery.filter(ready), [gallery]);
  const authors = useMemo(() => [...new Set(gallery.map(p => p.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru')), [gallery]);
  const filtered = gallery.filter(p => (!query || normalize(`${p.id} ${p.title} ${p.author}`).includes(normalize(query))) && (!author || p.author === author) && (!onlyImages || p.image));
  const mastered = paintings.filter(p => (data.progress[p.id]?.streak || 0) >= 3);
  const today = data.activity?.[localDay()] || { attempts: 0 };
  const percent = paintings.length ? Math.round(mastered.length / paintings.length * 100) : 0;
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 })); setStorageError(''); }
    catch { setStorageError('Не удалось сохранить прогресс. Скачай копию перед закрытием.'); }
  }, [data]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page, session?.key]);
  function startSession(mode = 'quiz', queueOverride) {
    const count = data.settings.count === 'all' ? paintings.length : data.settings.count;
    const queue = queueOverride || makeQueue(paintings, data.progress, data.settings.filter, count);
    if (!queue.length) { setToast(data.settings.filter === 'mistakes' ? 'Ошибок для повторения пока нет.' : 'Подборка закончилась. Выбери «Все картины» в настройках.'); return; }
    setSession({ key: Date.now(), queue, mode }); setViewing(null);
  }
  function recordReview(id, correct) {
    const day = localDay();
    setData(current => ({ ...current, progress: { ...current.progress, [id]: review(current.progress[id], correct) }, activity: { ...current.activity, [day]: { attempts: (current.activity?.[day]?.attempts || 0) + 1, correct: (current.activity?.[day]?.correct || 0) + Number(correct) } } }));
  }
  function setting(key, value) { setData(current => ({ ...current, settings: { ...current.settings, [key]: value } })); }
  function backup() { downloadJson({ ...data, version: 1, schema: 'art-memory', savedAt: new Date().toISOString() }, `art-progress-${localDay()}.json`); }
  const brand = <button className="brand" onClick={() => { setPage('home'); setSession(null); }} aria-label="артблять — главная"><span className="brand-icon"><Grid2X2 size={19} /></span><span>артблять<span className="brand-period">.</span></span></button>;
  return <div className={session ? 'quiz-shell' : 'app-shell simple-home'}>
    <header className={session ? 'quiz-header' : 'simple-header'}>{brand}<div className="header-actions">{!session && <button className={`header-link ${page === 'gallery' ? 'active' : ''}`} onClick={() => setPage(page === 'gallery' ? 'home' : 'gallery')}>Галерея</button>}<span className="daily-status"><Flame size={16} />{today.attempts} / {data.settings.dailyGoal}</span><button className="icon-button" aria-label="Настройки" onClick={() => setModal('settings')}><Settings2 size={18} /></button></div></header>
    {storageError && <div className="save-warning" role="alert">{storageError}<button className="text-button" onClick={backup}>Скачать копию</button></div>}
    <main className={session ? 'quiz-main' : 'landing'}>
      {session ? <Session key={session.key} session={session} paintings={paintings} tolerance={data.settings.tolerance} onReview={recordReview} onExit={() => setSession(null)} onRestart={(queue, mode) => startSession(mode, queue)} /> : page === 'gallery' ?
        <section className="gallery-page page-enter"><div className="gallery-heading"><div><h1>Галерея.</h1><p>{paintings.length} изображений · {gallery.length} работ</p></div></div>
          <div className="catalog-controls"><label className="search-box"><Search size={18} /><span className="sr-only">Поиск по коллекции</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Название, автор или номер" /></label><select className="author-select" aria-label="Автор" value={author} onChange={e => setAuthor(e.target.value)}><option value="">Все авторы</option>{authors.map(a => <option key={a}>{a}</option>)}</select><label className="image-filter"><input type="checkbox" checked={onlyImages} onChange={e => setOnlyImages(e.target.checked)} />С изображением</label></div>
          <div className="gallery-grid">{filtered.map(p => <button className="gallery-card" key={p.id} onClick={() => setViewing(p)} aria-label={`Открыть: ${p.title}`}><PaintingImage painting={p} reveal /><div><small>№{p.id}</small><strong>{p.title}</strong><span>{p.author || '—'}</span></div></button>)}</div>
          {!filtered.length && <div className="empty-state">Ничего не найдено.<button className="text-button" onClick={() => { setQuery(''); setAuthor(''); setOnlyImages(false); }}>Сбросить фильтры</button></div>}
        </section> :
        <><section className="landing-hero page-enter"><span className="pulse-dot" /><h1>Смотри.<br /><em>Узнавай.</em></h1><p>Квиз — четыре варианта. Экзамен — автор и название.</p><div className="hero-actions"><button className="button primary hero-button" onClick={() => startSession('quiz')}><Play size={18} />Квиз<ArrowRight size={18} /></button><button className="button secondary hero-button" onClick={() => startSession('exam')}><Type size={18} />Экзамен</button></div><button className="text-button session-settings" onClick={() => setModal('settings')}>{data.settings.count === 'all' ? 'Вся подборка' : `${data.settings.count} картин`} · {({ all: 'все работы', smart: 'умная подборка', mistakes: 'ошибки', new: 'новые' })[data.settings.filter]}<Settings2 size={14} /></button></section>
          <section className="landing-art page-enter" aria-label="Картина из коллекции"><div className="floating-frame"><PaintingImage painting={paintings.find(p => p.id === 77) || paintings[0]} reveal /></div><span className="orbit orbit-one" /><span className="orbit orbit-two" /></section>
          <section className="quiet-progress page-enter"><div><span>Запомнено</span><strong>{percent}%</strong></div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div><span>{mastered.length} из {paintings.length}</span></section></>}
    </main>
    {modal === 'settings' && <Modal title="Практика" onClose={() => setModal(null)}><div className="form-stack"><label>Количество картин<select value={data.settings.count} onChange={e => setting('count', e.target.value === 'all' ? 'all' : Number(e.target.value))}>{[10, 20, 30].map(n => <option key={n} value={n}>{n}</option>)}<option value="all">Вся подборка</option></select></label><label>Подборка<select value={data.settings.filter} onChange={e => setting('filter', e.target.value)}><option value="all">Все картины</option><option value="smart">Умная подборка</option><option value="mistakes">Ошибки</option><option value="new">Новые</option></select></label><label>Проверка экзамена<select value={data.settings.tolerance} onChange={e => setting('tolerance', e.target.value)}><option value="normal">Небольшие опечатки допустимы</option><option value="strict">Точное совпадение</option><option value="soft">Мягкая проверка</option></select></label><label>Цель на день<select value={data.settings.dailyGoal} onChange={e => setting('dailyGoal', Number(e.target.value))}>{[5, 10, 20, 30].map(n => <option key={n}>{n}</option>)}</select></label><button className="text-button" onClick={backup}><Download size={16} />Скачать прогресс</button><button className="button primary" onClick={() => setModal(null)}>Готово</button></div></Modal>}
    {viewing && <Modal title={viewing.title} onClose={() => setViewing(null)} wide><div className="painting-detail"><PaintingImage painting={viewing} reveal /><p>{viewing.author || 'Автор не указан'}</p>{ready(viewing) && <div className="button-row centered"><button className="button secondary" onClick={() => startSession('quiz', [viewing.id])}>Квиз</button><button className="button primary" onClick={() => startSession('exam', [viewing.id])}>Вспомнить на экзамене</button></div>}</div></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
