import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import PaintingImage from './PaintingImage.jsx';
import Modal from './Modal.jsx';
import { answerCatalog, checkAnswer } from '../lib/matching.js';
import { learningBatch, nextLearningStep } from '../lib/learning-batches.js';
import { studyTitle } from '../lib/study-groups.js';

export default function LearningSession({ session, paintings, tolerance, onSnapshot, onExit, onExam }) {
  const [index, setIndex] = useState(session.snapshot?.index || 0);
  const [phase, setPhase] = useState(session.snapshot?.phase || 'study');
  const [recallOrder, setRecallOrder] = useState(() => session.snapshot?.recallOrder || learningBatch(session.queue, session.snapshot?.index || 0).ids);
  const [written, setWritten] = useState(session.snapshot?.written || { author: '', title: '' });
  const [zoom, setZoom] = useState(false);
  const snapshot = useRef(onSnapshot); snapshot.current = onSnapshot;
  const input = useRef(null);
  const action = useRef(null);
  const batch = learningBatch(session.queue, index);
  const paintingId = phase === 'study' ? session.queue[index] : recallOrder[index - batch.start];
  const painting = paintings.find(p => p.id === paintingId);
  const finished = index >= session.queue.length;
  const known = useMemo(() => answerCatalog(paintings), [paintings]);
  useEffect(() => { snapshot.current(finished ? null : { index, phase, written, recallOrder }); }, [index, phase, written, recallOrder, finished]);
  useEffect(() => { if (phase === 'recall') input.current?.focus(); else action.current?.focus(); }, [phase, index]);
  function next() {
    const step = nextLearningStep(session.queue, index, phase);
    setWritten({ author: '', title: '' }); setPhase(step.phase); setIndex(step.index);
    if (step.recallOrder) setRecallOrder(step.recallOrder);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (finished) return <section className="quiz-result page-enter"><h1>Подборка изучена.</h1><p>Теперь попробуй вспомнить её на экзамене — без предварительного просмотра.</p><div className="button-row centered"><button className="button primary" onClick={() => onExam(session.queue)}>На экзамен<ArrowRight size={18} /></button><button className="text-button" onClick={onExit}>На главную</button></div></section>;
  if (!painting) return null;
  const author = painting.authorRequired === false || checkAnswer(written.author, painting.author, painting.authorAliases, 'author', tolerance, known.authors).accepted;
  const title = checkAnswer(written.title, painting.title, painting.titleAliases, 'title', tolerance, known.titles).accepted;
  return <section className="quiz-card page-enter"><div className="session-top"><button className="text-button" onClick={onExit}><ArrowLeft size={17} />Сохранить и выйти</button><span>Блок {Math.floor(index / 5) + 1} / {Math.ceil(session.queue.length / 5)} · {phase === 'study' ? 'Смотрим' : 'Вспоминаем'} · {index - batch.start + 1} / {batch.ids.length}</span></div><div className="session-progress"><div style={{ width: `${(batch.start * 2 + (phase === 'study' ? index - batch.start : batch.ids.length + index - batch.start + Number(phase === 'feedback'))) / (session.queue.length * 2) * 100}%` }} /></div>{session.studyFilters && <p className="study-topic">{studyTitle(session.studyFilters)}</p>}<div className="quiz-layout exam-layout"><div className="quiz-art"><PaintingImage key={painting.id} painting={painting} reveal={phase !== 'recall'} onZoom={() => setZoom(true)} /></div><div className="learning-answer" key={`${index}-${phase}`}>
    {phase === 'study' ? <><h2>{painting.title}</h2><p>{painting.author || 'Автор неизвестен'}</p><button ref={action} className="button primary" onClick={next}>{index + 1 === batch.end ? 'Вспомнить подборку' : 'Следующая работа'}<ArrowRight size={17} /></button></> : phase === 'recall' ? <form className="form-stack" onSubmit={e => { e.preventDefault(); setPhase('feedback'); }}>{painting.authorRequired !== false && <label>Автор<input ref={input} maxLength={180} autoComplete="off" spellCheck={false} value={written.author} onChange={e => setWritten(w => ({ ...w, author: e.target.value }))} /></label>}<label>Название<input ref={painting.authorRequired === false ? input : undefined} maxLength={180} autoComplete="off" spellCheck={false} value={written.title} onChange={e => setWritten(w => ({ ...w, title: e.target.value }))} /></label><button className="button primary" disabled={!written.title.trim() || painting.authorRequired !== false && !written.author.trim()}>Свериться</button><button className="text-button" type="button" onClick={() => setPhase('feedback')}>Показать ответ</button></form> : <><div className={`exam-feedback ${author && title ? 'correct' : 'wrong'}`} role="status"><strong>{author && title ? 'Вспомнил.' : 'Посмотри ещё раз.'}</strong><span>{painting.title}</span><small>{painting.author || 'Автор неизвестен'}</small>{written.title && <small>{painting.authorRequired !== false && <>Автор: {author ? '✓' : '✕'} · </>}Название: {title ? '✓' : '✕'}</small>}</div><div className="button-row"><button ref={action} className="button primary" onClick={next}>{index + 1 === session.queue.length ? 'Завершить' : index + 1 === batch.end ? 'Следующий блок' : 'Следующая работа'}<ArrowRight size={17} /></button><button className="text-button" onClick={() => { setWritten({ author: '', title: '' }); setPhase('recall'); }}>Попробовать снова</button></div></>}
  </div></div>{zoom && <Modal title="Рассмотреть работу" wide onClose={() => setZoom(false)}><PaintingImage painting={painting} reveal={phase !== 'recall'} zoom /></Modal>}</section>;
}
