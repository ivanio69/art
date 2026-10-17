import { ArrowRight } from 'lucide-react';
import Modal from './Modal.jsx';
import { epochs, studyWorks, unknownAuthor } from '../lib/study-groups.js';

export default function StudyPicker({ paintings, selection, onChange, onStart, onClose }) {
  const authors = [...new Set(paintings.map(p => p.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const works = studyWorks(paintings, selection);
  return <Modal title="Что изучаем?" onClose={onClose}>
    <form className="form-stack" onSubmit={event => { event.preventDefault(); if (works.length) onStart(works.map(p => p.id), selection); }}>
      <label>Эпоха<select value={selection.epoch} onChange={event => onChange({ ...selection, epoch: event.target.value })}>
        <option value="">Все эпохи</option>
        {epochs.map(epoch => <option key={epoch.id} value={epoch.id}>{epoch.title} · №{epoch.start}–{epoch.end}</option>)}
      </select></label>
      <label>Автор для изучения<select value={selection.author} onChange={event => onChange({ ...selection, author: event.target.value })}>
        <option value="">Все авторы</option>
        <option value={unknownAuthor}>Автор не указан</option>
        {authors.map(author => <option key={author} value={author}>{author}</option>)}
      </select></label>
      <p className="study-selection-count" role="status">{works.length ? <>Работ в подборке: <strong>{works.length}</strong>. Сначала просмотр с подписями, затем вспоминание — блоками до пяти работ.</> : 'У этого автора нет работ в выбранной эпохе. Измени автора или эпоху.'}</p>
      <button className="button primary full" disabled={!works.length}>Начать изучение<ArrowRight size={17} /></button>
      {(selection.epoch || selection.author) && <button className="text-button" type="button" onClick={() => onChange({ author: '', epoch: '' })}>Сбросить выбор</button>}
    </form>
  </Modal>;
}
