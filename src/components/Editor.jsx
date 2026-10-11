import { useState } from 'react';
import { Save } from 'lucide-react';
import Modal from './Modal.jsx';
import PaintingImage from './PaintingImage.jsx';
export default function Editor({ painting, onSave, onClose }) {
  const [values, setValues] = useState({ title: painting.title || '', author: painting.author || '', titleAliases: (painting.titleAliases || []).join('\n'), authorAliases: (painting.authorAliases || []).join('\n'), note: painting.note || '' });
  const field = (key, value) => setValues(s => ({ ...s, [key]: value }));
  function submit(e) { e.preventDefault(); onSave({ ...painting, title: values.title.trim(), author: values.author.trim(), titleAliases: values.titleAliases.split('\n').map(s => s.trim()).filter(Boolean), authorAliases: values.authorAliases.split('\n').map(s => s.trim()).filter(Boolean), note: values.note.trim() }); onClose(); }
  return <Modal title={`Картина №${painting.id}`} onClose={onClose} wide><div className="editor-layout"><PaintingImage painting={painting} reveal /><form onSubmit={submit} className="form-stack">
    <label>Название<input required maxLength={180} value={values.title} onChange={e => field('title', e.target.value)} placeholder="Название из вашего списка" /></label>
    <label>Автор<input required maxLength={180} value={values.author} onChange={e => field('author', e.target.value)} placeholder="Имя и фамилия художника" /></label>
    <details><summary>Другие допустимые ответы</summary><label>Варианты названия<textarea value={values.titleAliases} onChange={e => field('titleAliases', e.target.value)} placeholder="Каждый вариант с новой строки" /></label><label>Варианты имени автора<textarea value={values.authorAliases} onChange={e => field('authorAliases', e.target.value)} placeholder="Например, другое написание фамилии" /></label></details>
    <label>Как запомнить<textarea maxLength={2000} value={values.note} onChange={e => field('note', e.target.value)} placeholder="Ассоциация, деталь, короткая история…" /></label>
    <button className="button primary"><Save size={17} />Сохранить</button>
  </form></div></Modal>;
}
