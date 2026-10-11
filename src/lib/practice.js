import { ready, localDay } from './learning.js';

// Deterministic daily order: reopening the page doesn't reshuffle today's set.
export function dailyQueue(paintings, progress, count = 10, day = localDay()) {
  const hash = id => [...`${day}:${id}`].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return paintings.filter(ready).sort((a, b) => {
    const priority = p => { const s = progress[p.id]; return !s?.attempts ? 2 : s.streak === 0 ? 4 : s.due <= Date.parse(`${day}T23:59:59`) ? 3 : 1; };
    return priority(b) - priority(a) || hash(a.id) - hash(b.id);
  }).slice(0, count).map(p => p.id);
}

export function summarizeErrors(results, previous = {}) {
  const errors = { ...previous };
  for (const result of results) {
    if (result.correct) continue;
    const current = errors[result.id] || { author: 0, title: 0, skipped: 0, confusedWith: {} };
    errors[result.id] = {
      author: current.author + Number(result.author?.accepted === false),
      title: current.title + Number(result.title?.accepted === false),
      skipped: current.skipped + Number(!result.author && !result.selectedId),
      confusedWith: result.selectedId ? { ...current.confusedWith, [result.selectedId]: (current.confusedWith[result.selectedId] || 0) + 1 } : { ...current.confusedWith },
    };
  }
  return errors;
}

export function remainingSeconds(deadline, now = Date.now()) {
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export function unansweredResults(queue, results) {
  return queue.slice(results.length).map(id => ({ id, correct: false, timedOut: true }));
}

export function appendHistory(previous, entry) {
  if (previous.some(h => h.runId === entry.runId)) return previous;
  const history = [entry, ...previous].slice(0, 100);
  // Reserve localStorage room for progress and a resumable session.
  while (history.length > 1 && JSON.stringify(history).length > 1000000) history.pop();
  return history;
}
