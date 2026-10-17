import { ArrowRight, BookOpen, Play, Type, CalendarDays, RotateCcw } from 'lucide-react';
import PaintingImage from './PaintingImage.jsx';

export default function HomeDashboard({ painting, mastered, quizMastered, total, dailyCount, onStudy, onPractice, onDaily, onErrors }) {
  return <section className="home-dashboard page-enter">
    <div className="dashboard-intro"><div><span className="eyebrow">ТВОЯ КОЛЛЕКЦИЯ · {total} РАБОТ</span><h1>Что учим сегодня?</h1><p>Выбери, с чего начать. К следующему шагу можно перейти в любой момент.</p></div><div className="dashboard-art" aria-hidden="true"><PaintingImage painting={painting} reveal /></div></div>
    <div className="practice-cards">
      <button className="practice-card featured" onClick={onStudy} aria-label="Открыть обучение"><BookOpen size={26} /><strong>Обучение</strong><span>По автору или эпохе. Сначала смотри, затем вспоминай — по пять работ.</span><small>Выбрать подборку<ArrowRight size={17} /></small></button>
      <button className="practice-card" onClick={() => onPractice('quiz')} aria-label="Настроить квиз"><Play size={26} /><strong>Квиз</strong><span>Четыре варианта. Тренируй автора, название или всё вместе.</span><small>Выбрать режим<ArrowRight size={17} /></small></button>
      <button className="practice-card" onClick={() => onPractice('exam')} aria-label="Настроить экзамен"><Type size={26} /><strong>Экзамен</strong><span>Напиши автора и название. Проверка сразу или в конце.</span><small>Настроить проверку<ArrowRight size={17} /></small></button>
    </div>
    <div className="dashboard-shortcuts"><button onClick={onDaily}><CalendarDays size={20} /><span><strong>Повторить сегодня</strong><small>Ошибки и повторения · до {dailyCount} работ</small></span><ArrowRight size={18} /></button><button onClick={onErrors}><RotateCcw size={20} /><span><strong>Мои ошибки</strong><small>Разобрать то, что пока не вспоминается</small></span><ArrowRight size={18} /></button></div>
    <div className="dashboard-progress">{[['Помню на экзамене', mastered], ['Узнаю в квизе', quizMastered]].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}<small> / {total}</small></strong><div className="progress-track"><div style={{ width: `${total ? count / total * 100 : 0}%` }} /></div></div>)}</div>
  </section>;
}
