'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Download, Flame, Grid2X2, Search, Settings2, Heart, Bookmark, Upload } from 'lucide-react';
import collection from './lib/collection.json';
import imageManifest from './lib/images.json';
import { localDay, makeQueue, ready, review } from './lib/learning.js';
import { STORAGE_KEY, downloadJson } from './lib/storage.js';
import { normalize } from './lib/matching.js';
import PaintingImage from './components/PaintingImage.jsx';
import Modal from './components/Modal.jsx';
import Session from './components/Session.jsx';
import { defaultSettings, parseBackup, validSession } from './lib/user-data.js';
import { dailyQueue, summarizeErrors, appendHistory } from './lib/practice.js';
import Offline from './components/Offline.jsx';
import LearningSession from './components/LearningSession.jsx';
import { applyCorrection } from './lib/correction.js';
import { quizEligible, quizFields } from './lib/quiz.js';
import StudyPicker from './components/StudyPicker.jsx';
import { validStudyFilters, epochs, studyWorks } from './lib/study-groups.js';
import Navigation from './components/Navigation.jsx';
import HomeDashboard from './components/HomeDashboard.jsx';
import SessionSetup from './components/SessionSetup.jsx';
import ResumePanel from './components/ResumePanel.jsx';
import { pageFromHash, pageHash } from './lib/navigation.js';

const defaults = defaultSettings;
function initialData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1 && stored.progress && !Array.isArray(stored.progress)) {
      const settings = { ...defaults, ...stored.settings };
      if (![10, 20, 30, 'all'].includes(settings.count)) settings.count = 10;
      if (!['all', 'smart', 'mistakes', 'new', 'favorites', 'difficult'].includes(settings.filter)) settings.filter = 'all';
      if (!Object.hasOwn(quizFields, settings.quizField)) settings.quizField = 'both';
      if (!validStudyFilters({ author: settings.studyAuthor, epoch: settings.studyEpoch })) { settings.studyAuthor = ''; settings.studyEpoch = ''; }
      return { ...stored, settings, quizProgress: stored.quizProgress || stored.progress, examProgress: stored.examProgress || {}, marks: stored.marks || {}, history: stored.history || [], errors: stored.errors || {} };
    }
  } catch {}
  return { progress: {}, quizProgress: {}, examProgress: {}, marks: {}, activity: {}, history: [], errors: {}, settings: defaults };
}

export default function App() {
  const [data, setData] = useState(initialData);
  const [session, setSession] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);
  const [setup, setSetup] = useState(null);
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [pendingRestore, setPendingRestore] = useState(null);
  const restoreInput = useRef(null);
  const [page, setPage] = useState(() => typeof window === 'undefined' ? 'home' : pageFromHash(window.location.hash));
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [errorFilter, setErrorFilter] = useState('all');
  const touchStart = useRef(null);
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [epoch, setEpoch] = useState('');
  const [onlyImages, setOnlyImages] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [toast, setToast] = useState('');
  const gallery = useMemo(() => collection.map(p => ({ ...p, image: p.image?.startsWith('data:') ? p.image : imageManifest[p.id] || p.image })), []);
  const paintings = useMemo(() => gallery.filter(ready), [gallery]);
  const authors = useMemo(() => [...new Set(gallery.map(p => p.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru')), [gallery]);
  const ids = useMemo(() => new Set(gallery.map(p => p.id)), [gallery]);
  const resumable = validSession(data.savedSession, ids) && data.savedSession.queue.every(id => paintings.some(p => p.id === id));
  const filtered = studyWorks(gallery, { author, epoch }).filter(p => (!query || normalize(`${p.id} ${p.title} ${p.author}`).includes(normalize(query))) && (!onlyImages || p.image) && (collectionFilter === 'all' || data.marks[p.id]?.[collectionFilter]));
  const galleryPractice = filtered.filter(ready).map(p => p.id);
  const hasGalleryFilters = Boolean(query || author || epoch || onlyImages || collectionFilter !== 'all');
  const quizMastered = paintings.filter(p => (data.quizProgress[p.id]?.streak || 0) >= 3);
  const mastered = paintings.filter(p => (data.examProgress[p.id]?.streak || 0) >= 3);
  const today = data.activity?.[localDay()] || { attempts: 0 };
  const errorPaintings = paintings.filter(p => { const e = data.errors[p.id]; return e && (errorFilter === 'all' || (errorFilter === 'confusedWith' ? Object.keys(e.confusedWith).length : e[errorFilter] > 0)) && (data.examProgress[p.id]?.streak || 0) < 3; });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 })); setStorageError(''); }
    catch { setStorageError('Не удалось сохранить прогресс. Скачай копию перед закрытием.'); }
  }, [data]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page, session?.key]);
  useEffect(() => {
    function followHash() {
      if (window.location.hash === '#main-content') return;
      setPage(pageFromHash(window.location.hash)); setSession(null);
    }
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);
  useEffect(() => { if ('serviceWorker' in navigator && location.protocol !== 'file:' && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  function sessionQueue(mode, queueOverride, quizField = data.settings.quizField) {
    const pool = mode === 'quiz' ? paintings.filter(p => quizEligible(p, quizField)) : paintings;
    const count = data.settings.count === 'all' ? paintings.length : data.settings.count;
    return queueOverride ? queueOverride.filter(id => pool.some(p => p.id === id)) : makeQueue(data.settings.filter === 'difficult' ? pool.filter(p => data.marks[p.id]?.difficult) : pool.map(p => ({ ...p, favorite: data.marks[p.id]?.favorite })), mode === 'quiz' ? data.quizProgress : data.examProgress, data.settings.filter === 'difficult' ? 'all' : data.settings.filter, count);
  }
  function activateSession(nextSession) {
    setSession(nextSession); setPendingSession(null); setData(current => ({ ...current, savedSession: null })); setViewing(null);
  }
  function startSession(mode = 'quiz', queueOverride, blind = false, quizField = data.settings.quizField, studyFilters) {
    const queue = sessionQueue(mode, queueOverride, quizField);
    if (!queue.length && mode === 'quiz' && quizField === 'author') { setToast('В этой подборке нет работ с указанным автором. Выбери другой режим или подборку.'); return; }
    if (!queue.length) { setToast(data.settings.filter === 'mistakes' ? 'Ошибок для повторения пока нет.' : 'Подборка закончилась. Выбери «Все картины» в настройках.'); return; }
    const startedAt = Date.now();
    const nextSession = { key: startedAt, runId: `${startedAt}-${Math.random().toString(36).slice(2)}`, startedAt, queue, mode, quizField: mode === 'quiz' ? quizField : 'both', ...(studyFilters ? { studyFilters } : {}), blind, deadline: blind && data.settings.examMinutes ? startedAt + data.settings.examMinutes * 60000 : null };
    if (!session && resumable) { setPendingSession(nextSession); setModal(null); setViewing(null); return; }
    activateSession(nextSession);
  }
  function navigate(target) {
    if (target === 'study') { setModal('study'); return; }
    setPage(target); setSession(null); window.location.hash = pageHash(target);
  }
  function openSetup(mode, blind = false) { setSetup({ mode, blind }); setModal('setup'); }
  function resetGallery() { setQuery(''); setAuthor(''); setEpoch(''); setOnlyImages(false); setCollectionFilter('all'); }
  function completeSession(run, results) {
    setData(current => {
      const runId = run.runId || String(run.key);
      if (current.history.some(h => h.runId === runId)) return current;
      const entry = { runId: run.runId || String(run.key), date: Date.now(), mode: run.mode, quizField: run.quizField || 'both', blind: Boolean(run.blind), correct: results.filter(r => r.correct).length, total: results.length, seconds: Math.max(0, Math.round((Date.now() - (run.startedAt || Date.now())) / 1000)), results };
      return { ...current, savedSession: null, history: appendHistory(current.history, entry), errors: summarizeErrors(results, current.errors) };
    });
  }
  function moveViewing(direction) {
    const pool = filtered.length ? filtered : gallery;
    const index = pool.findIndex(p => p.id === viewing?.id);
    setViewing(pool[(index + direction + pool.length) % pool.length]);
  }
  useEffect(() => {
    if (!viewing) return;
    function key(event) { if (event.target.closest('input,textarea,select') || event.altKey || event.metaKey || event.ctrlKey) return; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveViewing(event.key === 'ArrowLeft' ? -1 : 1); } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  function recordReview(id, correct, mode, result) {
    const day = result?.reviewedDay || localDay();
    const now = result?.reviewedAt || Date.now();
    setData(current => ({ ...current, progress: { ...current.progress, [id]: review(current.progress[id], correct, false, now) }, [mode === 'exam' ? 'examProgress' : 'quizProgress']: { ...current[mode === 'exam' ? 'examProgress' : 'quizProgress'], [id]: review(current[mode === 'exam' ? 'examProgress' : 'quizProgress'][id], correct, false, now) }, activity: { ...current.activity, [day]: { attempts: (current.activity?.[day]?.attempts || 0) + 1, correct: (current.activity?.[day]?.correct || 0) + Number(correct) } } }));
  }
  function setting(key, value) { setData(current => ({ ...current, settings: { ...current.settings, [key]: value } })); }
  function backup() { downloadJson({ ...data, version: 1, schema: 'art-memory', savedAt: new Date().toISOString() }, `art-progress-${localDay()}.json`); }
  function toggleMark(id, key) { setData(current => ({ ...current, marks: { ...current.marks, [id]: { ...current.marks[id], [key]: !current.marks[id]?.[key] } } })); }
  function snapshot(value) { setData(current => ({ ...current, savedSession: value ? { ...session, snapshot: value } : null })); }
  async function restoreFile(event) {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try { if (file.size > 20 * 1024 * 1024) throw new Error('Копия слишком большая.'); setPendingRestore(parseBackup(JSON.parse(await file.text()), ids)); setModal('restore'); } catch (error) { setToast(error.message); }
  }
  const brand = <button className="brand" onClick={() => navigate('home')} aria-label="артблять — главная"><span className="brand-icon"><Grid2X2 size={19} /></span><span>артблять<span className="brand-period">.</span></span></button>;
  return <div className={session ? 'quiz-shell' : 'app-shell simple-home'}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>К содержимому</a>
    <header className={session ? 'quiz-header' : 'simple-header'}>{brand}{!session && <Navigation page={modal === 'study' ? 'study' : page === 'errors' ? 'history' : page} onNavigate={navigate} />}<div className="header-actions"><span className="daily-status" aria-label="Занятий сегодня"><Flame size={16} />{today.attempts} / {data.settings.dailyGoal}</span><button className="icon-button" aria-label="Настройки" onClick={() => setModal('settings')}><Settings2 size={18} /></button></div></header>
    {storageError && <div className="save-warning" role="alert">{storageError}<button className="text-button" onClick={backup}>Скачать копию</button></div>}
    <main id="main-content" tabIndex={-1} className={session ? 'quiz-main' : 'landing'}>
      {!session && resumable && <ResumePanel session={data.savedSession} onResume={() => setSession({ ...data.savedSession, key: Date.now() })} />}
      {session ? session.mode === 'learn' ? <LearningSession key={session.key} session={session} paintings={paintings} tolerance={data.settings.tolerance} onSnapshot={snapshot} onExit={() => setSession(null)} onExam={queue => startSession('exam', queue)} /> : <Session key={session.key} session={session} paintings={paintings} errorStats={data.errors} progress={data.progress} examProgress={data.examProgress} onCorrect={(run, result) => setData(current => applyCorrection(current, run, result))} tolerance={data.settings.tolerance} onReview={recordReview} onComplete={completeSession} onSnapshot={snapshot} onExit={() => setSession(null)} onRestart={(queue, mode, blind, field) => startSession(mode, queue, blind, field)} /> : page === 'history' ? <section className="history-page page-enter"><h1>Результаты.</h1><div className="button-row"><button className="button secondary" onClick={() => navigate('errors')}>Разобрать ошибки</button><button className="button primary" onClick={() => startSession('exam', dailyQueue(paintings, data.examProgress, Math.min(10, data.settings.dailyGoal)))}>На сегодня · {Math.min(10, data.settings.dailyGoal)} работ</button></div>{!data.history.length ? <p className="empty-state">Здесь появятся завершённые квизы и экзамены.</p> : <div className="history-trend">{['quiz', 'exam'].map(mode => { const entries = data.history.filter(h => h.mode === mode); if (!entries.length) return null; const last = Math.round(entries[0].correct / entries[0].total * 100); const previous = entries[1] && Math.round(entries[1].correct / entries[1].total * 100); return <div key={mode}><span>{mode === 'quiz' ? 'Квиз' : 'Экзамен'} · последний результат</span><strong>{last}%</strong>{previous !== undefined && <small>{last - previous > 0 ? '+' : ''}{last - previous} п. п. к предыдущему занятию</small>}</div>; })}</div>} {data.history.length > 0 && <div className="history-list">{data.history.map(h => <details key={h.runId}><summary><span>{new Date(h.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })} · {h.mode === 'quiz' ? `Квиз · ${quizFields[h.quizField || 'both']}` : h.blind ? 'Без подсказок' : 'Экзамен'}</span><strong>{h.correct} / {h.total} · {Math.round(h.correct / h.total * 100)}%</strong></summary><p>{Math.floor(h.seconds / 60)} мин {h.seconds % 60} сек</p><div className="review-list">{h.results.map(r => { const p = paintings.find(p => p.id === r.id); return p && <div key={r.id} className={r.correct ? 'review-correct' : 'review-wrong'}><img src={p.image} alt="" /><span><strong>{p.title}</strong><small>{p.author}</small>{r.manual && <small>Засчитано вручную</small>}{r.written && <small>Твой ответ: {r.written.author || '—'} · {r.written.title || '—'}</small>}</span><span>{r.correct ? '✓' : '✕'}</span></div>; })}</div>{h.results.some(r => !r.correct) && <button className="button secondary" onClick={() => startSession(h.mode, h.results.filter(r => !r.correct).map(r => r.id).filter(id => paintings.some(p => p.id === id)), false, h.quizField || 'both')}>Повторить ошибки</button>}</details>)}</div>}</section> : page === 'errors' ? <section className="history-page page-enter"><h1>Что не вспоминается.</h1><div className="filter-row">{[['all', 'Все'], ['author', 'Автор'], ['title', 'Название'], ['confusedWith', 'Путаю работы'], ['skipped', 'Пропуски']].map(([value, label]) => <button key={value} className={errorFilter === value ? 'selected' : ''} onClick={() => setErrorFilter(value)}>{label}</button>)}</div>{errorPaintings.length ? <><button className="button primary" onClick={() => startSession(errorFilter === 'confusedWith' ? 'quiz' : 'exam', errorPaintings.slice(0, 10).map(p => p.id))}>Разобрать ошибки · {Math.min(10, errorPaintings.length)}</button><div className="gallery-grid">{errorPaintings.map(p => <button className="gallery-card" key={p.id} onClick={() => setViewing(p)}><PaintingImage painting={p} reveal /><div><strong>{p.title}</strong><span>{p.author}</span><small>{[data.errors[p.id].author > 0 && `Автор: ${data.errors[p.id].author}`, data.errors[p.id].title > 0 && `Название: ${data.errors[p.id].title}`, data.errors[p.id].skipped > 0 && `Пропуски: ${data.errors[p.id].skipped}`].filter(Boolean).join(' · ')}</small>{Object.keys(data.errors[p.id].confusedWith).length > 0 && <small>Путаю с: {Object.keys(data.errors[p.id].confusedWith).map(id => gallery.find(work => work.id === Number(id))?.title).filter(Boolean).join(', ')}</small>}</div></button>)}</div></> : <p className="empty-state">Таких ошибок пока нет — или работы уже закреплены.</p>}</section> : page === 'gallery' ?
        <section className="gallery-page page-enter"><div className="gallery-heading"><div><h1>Галерея.</h1><p>{paintings.length} изображений · {gallery.length} работ</p></div></div>
          <div className="catalog-controls"><label className="search-box"><Search size={18} /><span className="sr-only">Поиск по коллекции</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Название, автор или номер" /></label><select className="author-select" aria-label="Автор" value={author} onChange={e => setAuthor(e.target.value)}><option value="">Все авторы</option>{authors.map(a => <option key={a}>{a}</option>)}</select><select className="epoch-select" aria-label="Эпоха в галерее" value={epoch} onChange={e => setEpoch(e.target.value)}><option value="">Все эпохи</option>{epochs.map(period => <option key={period.id} value={period.id}>{period.title}</option>)}</select><label className="image-filter"><input type="checkbox" checked={onlyImages} onChange={e => setOnlyImages(e.target.checked)} />С изображением</label></div>
          <div className="filter-row">{[['all', 'Все'], ['favorite', 'Избранное'], ['difficult', 'Сложные']].map(([value, label]) => <button key={value} className={collectionFilter === value ? 'selected' : ''} onClick={() => setCollectionFilter(value)}>{label}</button>)}</div>
          <div className="gallery-toolbar"><span role="status">Найдено {filtered.length} из {gallery.length}</span><div className="button-row">{hasGalleryFilters && <button className="text-button" onClick={resetGallery}>Сбросить фильтры</button>}<button className="button secondary" disabled={!galleryPractice.length} onClick={() => startSession('learn', galleryPractice, false, undefined, { author, epoch })}>Учить подборку<ArrowRight size={16} /></button></div></div>
          <div className="gallery-grid">{filtered.map(p => <button className="gallery-card" key={p.id} onClick={() => setViewing(p)} aria-label={`Открыть: ${p.title}`}><PaintingImage painting={p} reveal /><div><small>№{p.id}</small><strong>{p.title}</strong><span>{p.author || '—'}</span></div></button>)}</div>
          {!filtered.length && <div className="empty-state">Ничего не найдено.<button className="text-button" onClick={resetGallery}>Сбросить фильтры</button></div>}
        </section> :
        <HomeDashboard painting={paintings.find(p => p.id === 77) || paintings[0]} mastered={mastered.length} quizMastered={quizMastered.length} total={paintings.length} dailyCount={Math.min(10, data.settings.dailyGoal)} onStudy={() => setModal('study')} onPractice={openSetup} onDaily={() => startSession('exam', dailyQueue(paintings, data.examProgress, Math.min(10, data.settings.dailyGoal)))} onErrors={() => navigate('errors')} />}
    </main>
    {pendingSession && <Modal title="Начать новое занятие?" onClose={() => setPendingSession(null)}><p>Новое занятие заменит незавершённое. Прогресс и результаты останутся.</p><div className="button-row"><button className="button secondary" onClick={() => { setPendingSession(null); setSession({ ...data.savedSession, key: Date.now() }); }}>Продолжить прежнее</button><button className="button primary" onClick={() => activateSession(pendingSession)}>Начать новое</button></div></Modal>}
    {modal === 'setup' && setup && <SessionSetup key={setup.mode} mode={setup.mode} initialBlind={setup.blind} settings={data.settings} available={sessionQueue(setup.mode).length} onSetting={setting} onClose={() => setModal(null)} onStart={blind => { startSession(setup.mode, undefined, blind); setModal(null); }} />}
    {modal === 'study' && <StudyPicker paintings={paintings} selection={{ author: data.settings.studyAuthor, epoch: data.settings.studyEpoch }} onChange={selection => setData(current => ({ ...current, settings: { ...current.settings, studyAuthor: selection.author, studyEpoch: selection.epoch } }))} onClose={() => setModal(null)} onStart={(queue, selection) => { startSession('learn', queue, false, undefined, selection); setModal(null); }} />}
    {modal === 'settings' && <Modal title="Практика" onClose={() => setModal(null)}><div className="form-stack"><label>Количество картин<select value={data.settings.count} onChange={e => setting('count', e.target.value === 'all' ? 'all' : Number(e.target.value))}>{[10, 20, 30].map(n => <option key={n} value={n}>{n}</option>)}<option value="all">Вся подборка</option></select></label><label>Подборка<select value={data.settings.filter} onChange={e => setting('filter', e.target.value)}><option value="all">Все картины</option><option value="smart">Умная подборка</option><option value="mistakes">Ошибки</option><option value="new">Новые</option><option value="favorites">Избранное</option><option value="difficult">Сложные</option></select></label><label>Проверка экзамена<select value={data.settings.tolerance} onChange={e => setting('tolerance', e.target.value)}><option value="normal">Небольшие опечатки допустимы</option><option value="strict">Точное совпадение</option><option value="soft">Мягкая проверка</option></select></label><label>Таймер экзамена без подсказок<select value={data.settings.examMinutes || 0} onChange={e => setting('examMinutes', Number(e.target.value))}><option value={0}>Без ограничения</option>{[5, 10, 20, 30, 60].map(n => <option key={n} value={n}>{n} минут</option>)}</select></label><Offline images={paintings.map(p => p.image)} /><label>Цель на день<select value={data.settings.dailyGoal} onChange={e => setting('dailyGoal', Number(e.target.value))}>{[5, 10, 20, 30].map(n => <option key={n}>{n}</option>)}</select></label><button className="text-button" onClick={backup}><Download size={16} />Скачать прогресс</button><button className="text-button" onClick={() => restoreInput.current?.click()}><Upload size={16} />Восстановить из копии</button><button className="button primary" onClick={() => setModal(null)}>Готово</button></div></Modal>}
    {viewing && <Modal title={viewing.title} onClose={() => setViewing(null)} wide><div className="painting-detail" onTouchStart={e => { touchStart.current = e.touches[0].clientX; }} onTouchEnd={e => { const distance = e.changedTouches[0].clientX - (touchStart.current ?? e.changedTouches[0].clientX); if (Math.abs(distance) > 60) moveViewing(distance < 0 ? 1 : -1); touchStart.current = null; }}><div className="button-row centered"><button className="text-button" aria-label="Предыдущая работа" onClick={() => moveViewing(-1)}>←</button><button className="text-button" disabled={comparison.length === 2 && !comparison.some(p => p.id === viewing.id)} aria-pressed={comparison.some(p => p.id === viewing.id)} onClick={() => setComparison(current => current.some(p => p.id === viewing.id) ? current.filter(p => p.id !== viewing.id) : [...current, viewing])}>{comparison.some(p => p.id === viewing.id) ? 'Убрать из сравнения' : 'В сравнение'}</button><button className="text-button" aria-label="Следующая работа" onClick={() => moveViewing(1)}>→</button>{comparison.length === 2 && <button className="text-button" onClick={() => { setViewing(null); setModal('compare'); }}>Сравнить выбранные</button>}</div><PaintingImage painting={viewing} reveal /><p>{viewing.author || 'Автор не указан'}</p><div className="button-row centered"><button className="button secondary" aria-pressed={Boolean(data.marks[viewing.id]?.favorite)} onClick={() => toggleMark(viewing.id, 'favorite')}><Heart size={17} fill={data.marks[viewing.id]?.favorite ? 'currentColor' : 'none'} />Избранное</button><button className="button secondary" aria-pressed={Boolean(data.marks[viewing.id]?.difficult)} onClick={() => toggleMark(viewing.id, 'difficult')}><Bookmark size={17} fill={data.marks[viewing.id]?.difficult ? 'currentColor' : 'none'} />Сложная</button></div>{ready(viewing) && <div className="button-row centered"><button className="button secondary" onClick={() => startSession('learn', [viewing.id])}>Изучить</button><button className="button secondary" onClick={() => startSession('quiz', [viewing.id])}>Квиз</button><button className="button primary" onClick={() => startSession('exam', [viewing.id])}>Вспомнить на экзамене</button></div>}</div></Modal>}
    {comparison.length > 0 && !session && <div className="comparison-bar"><span>Выбрано {comparison.length} / 2</span><button className="button primary" disabled={comparison.length !== 2} onClick={() => { setViewing(null); setModal('compare'); }}>Сравнить</button><button className="text-button" onClick={() => setComparison([])}>Сбросить</button></div>}{modal === 'compare' && <Modal title="Сравнение" wide onClose={() => setModal(null)}><div className="comparison-grid">{comparison.map(p => <div key={p.id}><PaintingImage painting={p} reveal /><h2>{p.title}</h2><p>{p.author}</p></div>)}</div></Modal>}<input ref={restoreInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Копия прогресса" onChange={restoreFile} />
    {modal === 'restore' && pendingRestore && <Modal title="Восстановить прогресс?" onClose={() => { setModal('settings'); setPendingRestore(null); }}><p>Копия содержит {Object.keys(pendingRestore.progress).length} изученных работ. Она заменит текущий прогресс и настройки в этом браузере.</p><div className="button-row"><button className="button secondary" onClick={() => { setPendingRestore(null); setModal('settings'); }}>Отмена</button><button className="button primary" onClick={() => { backup(); setData(current => ({ ...current, ...pendingRestore })); setSession(null); setPendingRestore(null); setModal(null); setToast('Прогресс восстановлен. Предыдущая версия скачана.'); }}>Восстановить</button></div></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
