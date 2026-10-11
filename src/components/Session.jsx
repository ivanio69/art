import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react';
import Modal from './Modal.jsx';
import PaintingImage from './PaintingImage.jsx';
import { makeOptions, quizFields } from '../lib/quiz.js';
import { answerCatalog, checkAnswer } from '../lib/matching.js';
import { remainingSeconds, unansweredResults } from '../lib/practice.js';
import { localDay } from '../lib/learning.js';
import { canCorrect } from '../lib/correction.js';

export default function Session({ session, paintings, progress = {}, examProgress = {}, errorStats = {}, tolerance = 'normal', onReview, onCorrect, onSnapshot, onComplete, onExit, onRestart }) {
  const [index, setIndex] = useState(session.snapshot?.index || 0);
  const [answer, setAnswer] = useState(session.snapshot?.answer || null);
  const [selectedId, setSelectedId] = useState(session.snapshot?.selectedId ?? null);
  const [written, setWritten] = useState(session.snapshot?.written || { author: '', title: '' });
  const [results, setResults] = useState(session.snapshot?.results || []);
  const [zoom, setZoom] = useState(false);
  const [correction, setCorrection] = useState(null);
  const correctedIds = useRef(new Set());
  const [seconds, setSeconds] = useState(() => remainingSeconds(session.deadline));
  const completed = useRef(false);
  const expired = useRef(false);
  const completeCallback = useRef(onComplete); completeCallback.current = onComplete;
  const snapshotCallback = useRef(onSnapshot); snapshotCallback.current = onSnapshot;
  const input = useRef(null);
  const nextButton = useRef(null);
  const committed = useRef(Boolean(session.snapshot?.answer));
  const painting = paintings.find(p => p.id === session.queue[index]);
  const finished = index >= session.queue.length;
  const exam = session.mode === 'exam';
  const quizField = session.quizField || 'both';
  const blind = exam && session.blind;
  const options = useMemo(() => {
    if (!painting || exam) return [];
    if (session.snapshot?.index === index && session.snapshot.optionIds) return session.snapshot.optionIds.map(id => paintings.find(p => p.id === id));
    return makeOptions(painting, paintings, Math.random, Object.keys(errorStats[painting.id]?.confusedWith || {}).map(Number), quizField);
  }, [painting, paintings, exam, index, session.snapshot, errorStats, quizField]);
  const known = useMemo(() => answerCatalog(paintings), [paintings]);
  useEffect(() => { if (exam && !finished && answer === null) input.current?.focus(); if (answer) nextButton.current?.focus(); }, [index, exam, finished, answer]);
  useEffect(() => { snapshotCallback.current?.(finished ? null : { index, answer, selectedId, written, results, optionIds: options.map(p => p.id) }); }, [index, answer, selectedId, written, results, options, finished]);
  useEffect(() => {
    if (finished && !completed.current) { completed.current = true; completeCallback.current?.(session, results); }
  }, [finished, session, results]);
  useEffect(() => {
    if (!session.deadline || finished) return;
    const tick = () => setSeconds(remainingSeconds(session.deadline));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [session.deadline, finished]);
  useEffect(() => {
    if (seconds !== 0 || finished || expired.current) return;
    expired.current = true;
    const skipped = unansweredResults(session.queue, results);
    skipped.forEach(r => onReview(r.id, false, session.mode));
    setResults(current => [...current, ...skipped]); setAnswer(null); setIndex(session.queue.length);
  }, [seconds, finished, session.queue, session.mode, results.length, onReview]);
  useEffect(() => {
    function keydown(event) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]') || finished || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'Enter' && answer) { event.preventDefault(); next(); }
      else if (!exam && !answer && event.key === 'Enter' && selectedId !== null) { event.preventDefault(); commit(selectedId === painting.id, { selectedId }); }
      else if (!exam && !answer && /^[1-4]$/.test(event.key)) { event.preventDefault(); const option = options[Number(event.key) - 1]; if (option) setSelectedId(option.id); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  function commit(correct, details = {}) {
    if (committed.current) return;
    committed.current = true;
    if (session.deadline && remainingSeconds(session.deadline) === 0) { setSeconds(0); return; }
    const reviewedAt = Date.now();
    const result = { id: painting.id, correct, ...details, written: exam ? { ...written } : undefined, ...(exam ? { before: { overall: progress[painting.id] || null, exam: examProgress[painting.id] || null }, reviewedAt, reviewedDay: localDay(reviewedAt) } : {}) };
    setResults(current => [...current, result]); onReview(painting.id, correct, session.mode, result);
    if (blind) next(); else setAnswer(result);
  }
  function next() {
    committed.current = false; setAnswer(null); setSelectedId(null); setWritten({ author: '', title: '' }); setIndex(current => current + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function submit(event) {
    event.preventDefault();
    const title = checkAnswer(written.title, painting.title, painting.titleAliases || [], 'title', tolerance, known.titles);
    const author = painting.authorRequired === false ? { accepted: true } : checkAnswer(written.author, painting.author, painting.authorAliases || [], 'author', tolerance, known.authors);
    commit(author.accepted && title.accepted, { author, title });
  }
  function correctAnswer() {
    if (!correction || correctedIds.current.has(correction.id)) return;
    correctedIds.current.add(correction.id);
    const updated = { ...correction, correct: true, manual: true };
    setResults(current => current.map(r => r.id === updated.id ? updated : r));
    setAnswer(current => current?.id === updated.id ? updated : current);
    onCorrect(session, correction); setCorrection(null);
  }
  const correctionDialog = correction && <Modal title="Засчитать ответ?" onClose={() => setCorrection(null)}><p>Исправится только оценка этого ответа. Он будет отмечен как засчитанный вручную и не попадёт в ошибки. Название в коллекции останется прежним.</p><div className="button-row"><button className="button secondary" onClick={() => setCorrection(null)}>Отмена</button><button className="button primary" onClick={correctAnswer}>Да, мой ответ верный</button></div></Modal>;
  if (finished) {
    const correct = results.filter(r => r.correct).length;
    const misses = results.filter(r => !r.correct);
    return <section className="quiz-result page-enter"><div className="result-icon"><Trophy size={36} /></div><h1>{correct === results.length ? 'Идеально.' : 'Ещё один круг?'}</h1><strong>{correct} / {results.length}</strong><p>правильных ответов{expired.current ? ' · время вышло' : ''}</p><div className="review-list">{(blind ? results : misses).map(r => { const p = paintings.find(p => p.id === r.id); const selected = paintings.find(p => p.id === r.selectedId); return <div key={r.id} className={r.correct ? 'review-correct' : 'review-wrong'}><img src={p.image} alt="" /><span><strong>{p.title}</strong><small>{p.author}</small>{r.written && <small>Твой ответ: {r.written.author || '—'} · {r.written.title || '—'}</small>}{r.manual && <small>Засчитано вручную</small>}{r.author && !r.manual && <small>{p.authorRequired !== false && <>Автор: {r.author.accepted ? '✓' : '✕'} · </>}Название: {r.title.accepted ? '✓' : '✕'}</small>}{selected && !r.correct && <small>Перепутано с: {selected.title} — {selected.author}</small>}{!r.author && !r.selectedId && <small>{r.timedOut ? 'Не успел ответить' : 'Пропущено'}</small>}{exam && canCorrect(r) && <button className="text-button manual-correction" onClick={() => setCorrection(r)}>Мой ответ верный</button>}</span></div>; })}</div><div className="button-row centered">{misses.length > 0 && <button className="button primary" onClick={() => onRestart(misses.map(r => r.id), session.mode, false, quizField)}>Повторить ошибки<RotateCcw size={17} /></button>}<button className="button secondary" onClick={() => onRestart(session.queue, session.mode, blind, quizField)}>Ещё раз</button><button className="text-button" onClick={onExit}>На главную</button></div>{correctionDialog}</section>;
  }
  if (!painting) return null;
  return <section className="quiz-card page-enter"><div className="session-top"><button className="text-button" onClick={onExit}><ArrowLeft size={17} />Выйти</button><span>{blind ? 'Без подсказок' : exam ? 'Экзамен' : `Квиз · ${quizFields[quizField]}`} · {index + 1} / {session.queue.length}{seconds !== null && <time className={seconds < 60 ? 'timer urgent' : 'timer'} aria-label="Осталось времени">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>}</span></div><div className="session-progress"><div style={{ width: `${(index + Number(Boolean(answer))) / session.queue.length * 100}%` }} /></div>
    <div className={`quiz-layout ${exam ? 'exam-layout' : ''}`}><div className="quiz-art"><PaintingImage key={painting.image} painting={painting} onZoom={() => setZoom(true)} /><span>{exam ? 'Напиши автора и название' : quizField === 'author' ? 'Кто автор?' : quizField === 'title' ? 'Как называется работа?' : 'Что это за картина?'}</span></div>
      {exam ? <div className="exam-answer"><form onSubmit={submit} className="form-stack">{painting.authorRequired !== false && <label>Автор<input ref={input} maxLength={180} disabled={Boolean(answer)} value={written.author} onChange={e => setWritten(current => ({ ...current, author: e.target.value }))} placeholder="Фамилия или полное имя" autoComplete="off" autoCorrect="off" spellCheck={false} /></label>}<label>Название<input ref={painting.authorRequired === false ? input : undefined} maxLength={180} disabled={Boolean(answer)} value={written.title} onChange={e => setWritten(current => ({ ...current, title: e.target.value }))} placeholder="Название картины" autoComplete="off" autoCorrect="off" spellCheck={false} /></label>{!answer && <><button className="button primary full" disabled={!written.title.trim() || (painting.authorRequired !== false && !written.author.trim())}>{blind ? 'Сохранить ответ' : 'Проверить'}<ArrowRight size={17} /></button><button className="text-button" type="button" onClick={() => commit(false)}>Не помню</button></>}</form>{answer && <div className={`exam-feedback ${answer.correct ? 'correct' : 'wrong'}`}><strong>{answer.manual ? 'Засчитано вручную.' : answer.correct ? 'Верно.' : 'Запомним.'}</strong>{answer.title && !answer.manual && <div className="answer-checks">{painting.authorRequired !== false && <span>{answer.author.accepted ? <Check size={15} /> : <X size={15} />}Автор</span>}<span>{answer.title.accepted ? <Check size={15} /> : <X size={15} />}Название</span></div>}<span>{painting.title}</span><small>{painting.author || 'Автор не указан'}</small>{canCorrect(answer) && <button className="text-button manual-correction" onClick={() => setCorrection(answer)}>Мой ответ верный</button>}</div>}</div> :
        <div className="quiz-answers">{options.map((option, i) => { const isCorrect = option.id === painting.id; const wrong = answer?.selectedId === option.id && !isCorrect; const showCorrect = Boolean(answer) && isCorrect; return <button key={option.id} className={`quiz-option ${!answer && selectedId === option.id ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} aria-pressed={selectedId === option.id} onClick={() => setSelectedId(option.id)} disabled={Boolean(answer)}><i>{i + 1}</i><span><strong>{quizField === 'author' ? option.author : option.title}</strong>{quizField === 'both' && <small>{option.author || 'Автор не указан'}</small>}</span>{showCorrect && <Check size={19} />}{wrong && <X size={19} />}</button>; })}{!answer && <button className="button primary full" disabled={selectedId === null} onClick={() => commit(selectedId === painting.id, { selectedId })}>Ответить<ArrowRight size={17} /></button>}</div>}
    </div>
    {correctionDialog}
    {zoom && <Modal title="Рассмотреть работу" wide onClose={() => setZoom(false)}><div className="painting-detail"><PaintingImage painting={painting} zoom /></div></Modal>}
    {answer && <><p className="sr-only" role="status">{answer.correct ? 'Верно' : 'Неверно'}. {painting.title}. {painting.author}</p><button ref={nextButton} className="button primary quiz-next" onClick={next}>{index + 1 === session.queue.length ? 'Результат' : 'Дальше'}<ArrowRight size={18} /></button></>}
  </section>;
}
