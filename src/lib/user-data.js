export const defaultSettings = { count: 10, dailyGoal: 10, tolerance: 'normal', filter: 'all', examMinutes: 0 };
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const validResult = (r, ids) => record(r) && ids.has(r.id) && typeof r.correct === 'boolean' && (!r.written || record(r.written) && ['author', 'title'].every(k => typeof r.written[k] === 'string' && r.written[k].length <= 180)) && ((!r.author && !r.title) || record(r.author) && typeof r.author.accepted === 'boolean' && record(r.title) && typeof r.title.accepted === 'boolean') && (!r.selectedId || ids.has(r.selectedId));
function validProgress(value) {
  return record(value) && Object.entries(value).every(([id, p]) => /^\d+$/.test(id) && record(p) && ['attempts', 'correct', 'errors', 'streak', 'due', 'last'].every(k => Number.isFinite(p[k]) && p[k] >= 0) && p.correct <= p.attempts);
}
export function validSession(session, ids) {
  if (!record(session) || !['quiz', 'exam'].includes(session.mode) || !Array.isArray(session.queue) || !session.queue.length || session.queue.length > 1000 || !session.queue.every(id => ids.has(id)) || new Set(session.queue).size !== session.queue.length) return false;
  const s = session.snapshot;
  if (session.blind !== undefined && typeof session.blind !== 'boolean' || session.deadline != null && (!Number.isFinite(session.deadline) || session.deadline < 0) || session.startedAt != null && (!Number.isFinite(session.startedAt) || session.startedAt < 0)) return false;
  if (session.blind && (session.mode !== 'exam' || s?.answer)) return false;
  if (!record(s) || !Number.isInteger(s.index) || s.index < 0 || s.index >= session.queue.length || !Array.isArray(s.results)) return false;
  if (s.results.length !== s.index + Number(Boolean(s.answer)) || !s.results.every((r, i) => validResult(r, ids) && r.id === session.queue[i])) return false;
  if (s.answer && (!record(s.answer) || s.answer.id !== session.queue[s.index] || typeof s.answer.correct !== 'boolean' || s.answer.correct !== s.results.at(-1).correct)) return false;
  if (s.answer?.title && (!record(s.answer.title) || typeof s.answer.title.accepted !== 'boolean' || !record(s.answer.author) || typeof s.answer.author.accepted !== 'boolean')) return false;
  if (!record(s.written) || !['author', 'title'].every(k => typeof s.written[k] === 'string' && s.written[k].length <= 180)) return false;
  return session.mode === 'exam' || (Array.isArray(s.optionIds) && s.optionIds.length === 4 && new Set(s.optionIds).size === 4 && s.optionIds.includes(session.queue[s.index]) && s.optionIds.every(id => ids.has(id)) && (!s.answer || s.optionIds.includes(s.answer.selectedId)));
}
export function parseBackup(copy, ids) {
  if (!record(copy) || copy.schema !== 'art-memory' || copy.version !== 1 || !validProgress(copy.progress)) throw new Error('Это не корректная копия прогресса.');
  if (copy.quizProgress && !validProgress(copy.quizProgress) || copy.examProgress && !validProgress(copy.examProgress)) throw new Error('В копии повреждён прогресс режимов.');
  const settings = { ...defaultSettings, ...copy.settings };
  if (![10, 20, 30, 'all'].includes(settings.count) || ![5, 10, 20, 30].includes(settings.dailyGoal) || ![0, 5, 10, 20, 30, 60].includes(settings.examMinutes) || !['normal', 'strict', 'soft'].includes(settings.tolerance) || !['all', 'smart', 'mistakes', 'new', 'favorites', 'difficult'].includes(settings.filter)) throw new Error('В копии некорректные настройки.');
  if (!record(copy.activity) || !Object.entries(copy.activity).every(([day, a]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && record(a) && Number.isFinite(a.attempts) && a.attempts >= 0 && Number.isFinite(a.correct) && a.correct >= 0 && a.correct <= a.attempts)) throw new Error('В копии повреждена история занятий.');
  const marks = copy.marks || {};
  if (!record(marks) || !Object.entries(marks).every(([id, m]) => ids.has(Number(id)) && record(m) && Object.entries(m).every(([k, v]) => ['favorite', 'difficult'].includes(k) && typeof v === 'boolean'))) throw new Error('В копии некорректные отметки картин.');
  const history = copy.history || [];
  if (!Array.isArray(history) || history.length > 100 || new Set(history.map(h => h?.runId)).size !== history.length || !history.every(h => record(h) && typeof h.runId === 'string' && ['quiz', 'exam'].includes(h.mode) && Number.isFinite(h.date) && h.date >= 0 && Number.isFinite(h.seconds) && h.seconds >= 0 && Number.isInteger(h.total) && h.total > 0 && Array.isArray(h.results) && h.results.length === h.total && h.results.every(r => validResult(r, ids)) && h.correct === h.results.filter(r => r.correct).length)) throw new Error('В копии повреждены результаты занятий.');
  const errors = copy.errors || {};
  if (!record(errors) || !Object.entries(errors).every(([id, e]) => ids.has(Number(id)) && record(e) && ['author', 'title', 'skipped'].every(k => Number.isInteger(e[k]) && e[k] >= 0) && record(e.confusedWith) && Object.entries(e.confusedWith).every(([other, count]) => ids.has(Number(other)) && Number.isInteger(count) && count >= 0))) throw new Error('В копии повреждён разбор ошибок.');
  return { progress: copy.progress, quizProgress: copy.quizProgress || copy.progress, examProgress: copy.examProgress || {}, activity: copy.activity, settings, marks, history, errors, savedSession: validSession(copy.savedSession, ids) ? copy.savedSession : null };
}
