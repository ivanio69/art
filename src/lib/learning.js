export function ready(painting) { return Boolean(painting.image && (painting.authorRequired === false || painting.author?.trim()) && painting.title?.trim()); }
export function localDay(time = Date.now()) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function review(previous = {}, correct, assisted = false, now = Date.now()) {
  const effectiveCorrect = correct && !assisted;
  const streak = effectiveCorrect ? (previous.streak || 0) + 1 : 0;
  const days = [0, 1, 3, 7, 14, 30][Math.min(streak, 5)];
  return { ...previous, attempts: (previous.attempts || 0) + 1, correct: (previous.correct || 0) + Number(effectiveCorrect), errors: (previous.errors || 0) + Number(!effectiveCorrect), streak, due: now + (effectiveCorrect ? days * 86400000 : 10 * 60000), last: now };
}
export function shuffle(items, random = Math.random) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
  return array;
}
export function makeQueue(paintings, progress, filter, count, now = Date.now()) {
  let pool = paintings.filter(ready);
  if (filter === 'mistakes') pool = pool.filter(p => (progress[p.id]?.errors || 0) > 0 && (progress[p.id]?.streak || 0) < 3);
  if (filter === 'favorites') pool = pool.filter(p => p.favorite);
  if (filter === 'new') pool = pool.filter(p => !progress[p.id]?.attempts);
  if (filter === 'smart') pool = pool.filter(p => !progress[p.id]?.attempts || (progress[p.id]?.due || 0) <= now);
  if (filter === 'due') pool = pool.filter(p => (progress[p.id]?.due || 0) <= now);
  const shuffled = shuffle(pool);
  if (filter === 'smart') shuffled.sort((a, b) => {
    const score = p => { const s = progress[p.id]; return !s?.attempts ? 1 : s.due <= now ? 4 + s.errors / s.attempts : 0; };
    return score(b) - score(a);
  });
  return shuffled.slice(0, count).map(p => p.id);
}
