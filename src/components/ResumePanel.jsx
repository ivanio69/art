import { ArrowRight } from 'lucide-react';
import { studyTitle } from '../lib/study-groups.js';
import { quizFields } from '../lib/quiz.js';

export default function ResumePanel({ session, onResume }) {
  const index = session.snapshot.index;
  const title = session.mode === 'learn' ? studyTitle(session.studyFilters) : session.mode === 'quiz' ? quizFields[session.quizField || 'both'] : session.blind ? 'Без подсказок' : 'Автор и название';
  return <aside className="resume-panel" aria-label="Незаконченное занятие"><div><strong>{session.mode === 'learn' ? 'Обучение' : session.mode === 'quiz' ? 'Квиз' : 'Экзамен'} · можно продолжить</strong><span>{title}{title && ' · '}{session.mode === 'learn' ? `Блок ${Math.floor(index / 5) + 1} из ${Math.ceil(session.queue.length / 5)}` : `Работа ${index + 1} из ${session.queue.length}`}</span></div><button className="button primary" onClick={onResume}>Продолжить<ArrowRight size={17} /></button></aside>;
}
