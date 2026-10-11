import { review } from './learning.js';

export function canCorrect(result) {
  return Boolean(result && !result.correct && !result.manual && result.before && result.written?.title?.trim() && result.author && result.title);
}

export function applyCorrection(data, session, result) {
  if (session.mode !== 'exam' || !canCorrect(result)) return data;
  const runId = session.runId || String(session.key);
  const entry = data.history.find(h => h.runId === runId);
  if (entry?.results.find(r => r.id === result.id)?.manual) return data;
  const corrected = { ...result, correct: true, manual: true };
  const exam = review(result.before.exam || {}, true, false, result.reviewedAt);
  const current = data.examProgress[result.id];
  if (current?.last === exam.last && current.correct === exam.correct && current.errors === exam.errors) return data;
  const modeProgress = { ...data.examProgress, [result.id]: exam };
  const progress = { ...data.progress, [result.id]: review(result.before.overall || {}, true, false, result.reviewedAt) };
  const activity = { ...data.activity, [result.reviewedDay]: { ...data.activity[result.reviewedDay], correct: (data.activity[result.reviewedDay]?.correct || 0) + 1 } };
  const history = data.history.map(h => h.runId === runId ? { ...h, correct: h.correct + 1, results: h.results.map(r => r.id === result.id ? corrected : r) } : h);
  const errors = { ...data.errors };
  if (entry && errors[result.id]) {
    const old = errors[result.id];
    errors[result.id] = { ...old, author: Math.max(0, old.author - Number(result.author.accepted === false)), title: Math.max(0, old.title - Number(result.title.accepted === false)) };
    if (!errors[result.id].author && !errors[result.id].title && !old.skipped && !Object.values(old.confusedWith).some(Boolean)) delete errors[result.id];
  }
  return { ...data, progress, examProgress: modeProgress, activity, history, errors };
}
