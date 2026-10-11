export const defaultSettings = { count: 10, dailyGoal: 10, tolerance: 'normal', filter: 'all' };
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
function validProgress(value) {
  return record(value) && Object.entries(value).every(([id, p]) => /^\d+$/.test(id) && record(p) && ['attempts', 'correct', 'errors', 'streak', 'due', 'last'].every(k => Number.isFinite(p[k]) && p[k] >= 0) && p.correct <= p.attempts);
}
export function validSession(session, ids) {
  if (!record(session) || !['quiz', 'exam'].includes(session.mode) || !Array.isArray(session.queue) || !session.queue.length || session.queue.length > 1000 || !session.queue.every(id => ids.has(id)) || new Set(session.queue).size !== session.queue.length) return false;
  const s = session.snapshot;
  if (!record(s) || !Number.isInteger(s.index) || s.index < 0 || s.index >= session.queue.length || !Array.isArray(s.results)) return false;
  if (s.results.length !== s.index + Number(Boolean(s.answer)) || !s.results.every((r, i) => record(r) && r.id === session.queue[i] && typeof r.correct === 'boolean')) return false;
  if (s.answer && (!record(s.answer) || s.answer.id !== session.queue[s.index] || typeof s.answer.correct !== 'boolean' || s.answer.correct !== s.results.at(-1).correct)) return false;
  if (s.answer?.title && (!record(s.answer.title) || typeof s.answer.title.accepted !== 'boolean' || !record(s.answer.author) || typeof s.answer.author.accepted !== 'boolean')) return false;
  if (!record(s.written) || !['author', 'title'].every(k => typeof s.written[k] === 'string' && s.written[k].length <= 180)) return false;
  return session.mode === 'exam' || (Array.isArray(s.optionIds) && s.optionIds.length === 4 && new Set(s.optionIds).size === 4 && s.optionIds.includes(session.queue[s.index]) && s.optionIds.every(id => ids.has(id)) && (!s.answer || s.optionIds.includes(s.answer.selectedId)));
}
export function parseBackup(copy, ids) {
  if (!record(copy) || copy.schema !== 'art-memory' || copy.version !== 1 || !validProgress(copy.progress)) throw new Error('Это не корректная копия прогресса.');
  if (copy.quizProgress && !validProgress(copy.quizProgress) || copy.examProgress && !validProgress(copy.examProgress)) throw new Error('В копии повреждён прогресс режимов.');
  const settings = { ...defaultSettings, ...copy.settings };
  if (![10, 20, 30, 'all'].includes(settings.count) || ![5, 10, 20, 30].includes(settings.dailyGoal) || !['normal', 'strict', 'soft'].includes(settings.tolerance) || !['all', 'smart', 'mistakes', 'new', 'favorites', 'difficult'].includes(settings.filter)) throw new Error('В копии некорректные настройки.');
  if (!record(copy.activity) || !Object.entries(copy.activity).every(([day, a]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && record(a) && Number.isFinite(a.attempts) && a.attempts >= 0 && Number.isFinite(a.correct) && a.correct >= 0 && a.correct <= a.attempts)) throw new Error('В копии повреждена история занятий.');
  const marks = copy.marks || {};
  if (!record(marks) || !Object.entries(marks).every(([id, m]) => ids.has(Number(id)) && record(m) && Object.entries(m).every(([k, v]) => ['favorite', 'difficult'].includes(k) && typeof v === 'boolean'))) throw new Error('В копии некорректные отметки картин.');
  return { progress: copy.progress, quizProgress: copy.quizProgress || copy.progress, examProgress: copy.examProgress || {}, activity: copy.activity, settings, marks, savedSession: validSession(copy.savedSession, ids) ? copy.savedSession : null };
}
