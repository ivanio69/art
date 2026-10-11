import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react';
import Modal from './Modal.jsx';
import PaintingImage from './PaintingImage.jsx';
import { makeOptions } from '../lib/quiz.js';
import { checkAnswer, normalize } from '../lib/matching.js';

export default function Session({ session, paintings, tolerance = 'normal', onReview, onSnapshot, onExit, onRestart }) {
  const [index, setIndex] = useState(session.snapshot?.index || 0);
  const [answer, setAnswer] = useState(session.snapshot?.answer || null);
  const [written, setWritten] = useState(session.snapshot?.written || { author: '', title: '' });
  const [results, setResults] = useState(session.snapshot?.results || []);
  const [zoom, setZoom] = useState(false);
  const snapshotCallback = useRef(onSnapshot); snapshotCallback.current = onSnapshot;
  const input = useRef(null);
  const nextButton = useRef(null);
  const committed = useRef(Boolean(session.snapshot?.answer));
  const painting = paintings.find(p => p.id === session.queue[index]);
  const finished = index >= session.queue.length;
  const exam = session.mode === 'exam';
  const options = useMemo(() => {
    if (!painting || exam) return [];
    if (session.snapshot?.index === index && session.snapshot.optionIds) return session.snapshot.optionIds.map(id => paintings.find(p => p.id === id));
    return makeOptions(painting, paintings);
  }, [painting, paintings, exam, index, session.snapshot]);
  const knownAuthors = useMemo(() => paintings.flatMap(p => [p.author, ...(p.authorAliases || [])]).filter(Boolean).flatMap(author => [author, normalize(author).split(' ').filter(word => word.length > 1 && !['старший', 'младший', 'др'].includes(word)).at(-1)]), [paintings]);
  const knownTitles = useMemo(() => paintings.flatMap(p => [p.title, ...(p.titleAliases || [])]).filter(Boolean), [paintings]);
  useEffect(() => { if (exam && !finished && answer === null) input.current?.focus(); if (answer) nextButton.current?.focus(); }, [index, exam, finished, answer]);
  useEffect(() => { snapshotCallback.current?.(finished ? null : { index, answer, written, results, optionIds: options.map(p => p.id) }); }, [index, answer, written, results, options, finished]);
  useEffect(() => {
    function keydown(event) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]') || finished || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'Enter' && answer) { event.preventDefault(); next(); }
      else if (!exam && !answer && /^[1-4]$/.test(event.key)) { event.preventDefault(); const option = options[Number(event.key) - 1]; if (option) commit(option.id === painting.id, { selectedId: option.id }); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  function commit(correct, details = {}) {
    if (committed.current) return;
    committed.current = true;
    const result = { id: painting.id, correct, ...details };
    setAnswer(result); setResults(current => [...current, result]); onReview(painting.id, correct, session.mode);
  }
  function next() {
    committed.current = false; setAnswer(null); setWritten({ author: '', title: '' }); setIndex(current => current + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function submit(event) {
    event.preventDefault();
    const title = checkAnswer(written.title, painting.title, painting.titleAliases || [], 'title', tolerance, knownTitles);
    const author = painting.authorRequired === false ? { accepted: true } : checkAnswer(written.author, painting.author, painting.authorAliases || [], 'author', tolerance, knownAuthors);
    commit(author.accepted && title.accepted, { author, title });
  }
  if (finished) {
    const correct = results.filter(r => r.correct).length;
    const misses = results.filter(r => !r.correct);
    return <section className="quiz-result page-enter"><div className="result-icon"><Trophy size={36} /></div><h1>{correct === results.length ? 'Идеально.' : 'Ещё один круг?'}</h1><strong>{correct} / {results.length}</strong><p>правильных ответов</p>{misses.length > 0 && <div className="review-list">{misses.map(r => { const p = paintings.find(p => p.id === r.id); return <div key={r.id}><img src={p.image} alt="" /><span><strong>{p.title}</strong><small>{p.author}</small></span></div>; })}</div>}<div className="button-row centered">{misses.length > 0 && <button className="button primary" onClick={() => onRestart(misses.map(r => r.id), session.mode)}>Повторить ошибки<RotateCcw size={17} /></button>}<button className="button secondary" onClick={() => onRestart(session.queue, session.mode)}>Ещё раз</button><button className="text-button" onClick={onExit}>На главную</button></div></section>;
  }
  if (!painting) return null;
  return <section className="quiz-card page-enter"><div className="session-top"><button className="text-button" onClick={onExit}><ArrowLeft size={17} />Выйти</button><span>{exam ? 'Экзамен' : 'Квиз'} · {index + 1} / {session.queue.length}</span></div><div className="session-progress"><div style={{ width: `${(index + Number(Boolean(answer))) / session.queue.length * 100}%` }} /></div>
    <div className={`quiz-layout ${exam ? 'exam-layout' : ''}`}><div className="quiz-art"><PaintingImage key={painting.image} painting={painting} onZoom={() => setZoom(true)} /><span>{exam ? 'Напиши автора и название' : 'Что это за картина?'}</span></div>
      {exam ? <div className="exam-answer"><form onSubmit={submit} className="form-stack">{painting.authorRequired !== false && <label>Автор<input ref={input} maxLength={180} disabled={Boolean(answer)} value={written.author} onChange={e => setWritten(current => ({ ...current, author: e.target.value }))} placeholder="Фамилия или полное имя" autoComplete="off" autoCorrect="off" spellCheck={false} /></label>}<label>Название<input ref={painting.authorRequired === false ? input : undefined} maxLength={180} disabled={Boolean(answer)} value={written.title} onChange={e => setWritten(current => ({ ...current, title: e.target.value }))} placeholder="Название картины" autoComplete="off" autoCorrect="off" spellCheck={false} /></label>{!answer && <><button className="button primary full" disabled={!written.title.trim() || (painting.authorRequired !== false && !written.author.trim())}>Проверить<ArrowRight size={17} /></button><button className="text-button" type="button" onClick={() => commit(false)}>Не помню</button></>}</form>{answer && <div className={`exam-feedback ${answer.correct ? 'correct' : 'wrong'}`}><strong>{answer.correct ? 'Верно.' : 'Запомним.'}</strong>{answer.title && <div className="answer-checks">{painting.authorRequired !== false && <span>{answer.author.accepted ? <Check size={15} /> : <X size={15} />}Автор</span>}<span>{answer.title.accepted ? <Check size={15} /> : <X size={15} />}Название</span></div>}<span>{painting.title}</span><small>{painting.author || 'Автор не указан'}</small></div>}</div> :
        <div className="quiz-answers">{options.map((option, i) => { const isCorrect = option.id === painting.id; const wrong = answer?.selectedId === option.id && !isCorrect; const showCorrect = Boolean(answer) && isCorrect; return <button key={option.id} className={`quiz-option ${showCorrect ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} onClick={() => commit(isCorrect, { selectedId: option.id })} disabled={Boolean(answer)}><i>{i + 1}</i><span><strong>{option.title}</strong><small>{option.author || 'Автор не указан'}</small></span>{showCorrect && <Check size={19} />}{wrong && <X size={19} />}</button>; })}</div>}
    </div>
    {zoom && <Modal title="Рассмотреть работу" wide onClose={() => setZoom(false)}><div className="painting-detail"><PaintingImage painting={painting} zoom /></div></Modal>}
    {answer && <><p className="sr-only" role="status">{answer.correct ? 'Верно' : 'Неверно'}. {painting.title}. {painting.author}</p><button ref={nextButton} className="button primary quiz-next" onClick={next}>{index + 1 === session.queue.length ? 'Результат' : 'Дальше'}<ArrowRight size={18} /></button></>}
  </section>;
}
