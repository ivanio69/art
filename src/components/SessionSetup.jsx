import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from './Modal.jsx';
import { quizFields } from '../lib/quiz.js';

export default function SessionSetup({ mode, initialBlind = false, settings, available, onSetting, onStart, onClose }) {
  const [blind, setBlind] = useState(initialBlind);
  const quiz = mode === 'quiz';
  return <Modal title={quiz ? 'Настроить квиз' : 'Настроить экзамен'} onClose={onClose}>
    <form className="form-stack" onSubmit={event => { event.preventDefault(); if (available) onStart(blind); }}>
      {quiz ? <label>Что вспоминаем?<select value={settings.quizField} onChange={event => onSetting('quizField', event.target.value)}>{Object.entries(quizFields).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : <label>Когда проверять ответы?<select value={blind ? 'end' : 'each'} onChange={event => setBlind(event.target.value === 'end')}><option value="each">После каждой работы</option><option value="end">В конце — без подсказок</option></select></label>}
      <div className="setup-fields"><label>Количество работ<select value={settings.count} onChange={event => onSetting('count', event.target.value === 'all' ? 'all' : Number(event.target.value))}>{[10, 20, 30].map(count => <option key={count} value={count}>{count}</option>)}<option value="all">Вся подборка</option></select></label>
      <label>Подборка<select value={settings.filter} onChange={event => onSetting('filter', event.target.value)}>{Object.entries({ all: 'Все работы', smart: 'Умная подборка', mistakes: 'Мои ошибки', new: 'Новые', favorites: 'Избранное', difficult: 'Сложные' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {!quiz && blind && <label>Время<select value={settings.examMinutes} onChange={event => onSetting('examMinutes', Number(event.target.value))}><option value={0}>Без ограничения</option>{[5, 10, 20, 30, 60].map(minutes => <option key={minutes} value={minutes}>{minutes} минут</option>)}</select></label>}
      <p className="setup-summary" role="status">{available ? `Работ в занятии: ${available}. Можно сохранить и продолжить позже.` : 'В этой подборке пока нет подходящих работ. Попробуй «Все работы».'}</p>
      <button className="button primary full" disabled={!available}>Начать {quiz ? 'квиз' : 'экзамен'}<ArrowRight size={17} /></button>
    </form>
  </Modal>;
}
