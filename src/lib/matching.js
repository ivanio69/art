export function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[іІ]/g, 'i').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, value => ({i:'1',ii:'2',iii:'3',iv:'4',v:'5',vi:'6',vii:'7',viii:'8',ix:'9',x:'10'}[value]));
}

export function answerCatalog(paintings) {
  const authors = paintings.flatMap(p => [p.author, ...(p.authorAliases || [])]).filter(Boolean).flatMap(author => [author, normalize(author).split(' ').filter(word => word.length > 1 && !['старший', 'младший', 'др'].includes(word)).at(-1)]);
  const titles = paintings.flatMap(p => [p.title, ...(p.titleAliases || [])]).filter(Boolean);
  return { authors, titles };
}

// Optimal string alignment distance accepts missing letters and adjacent swaps.
export function distance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
  }
  return matrix[a.length][b.length];
}

function tokenMatches(a, b, tolerance) {
  if (a === b) return true;
  const length = Math.max(a.length, b.length);
  const allowed = length < 4 ? 0 : length < 8 ? 1 : Math.min(tolerance === 'soft' ? 3 : 2, Math.floor(length * (tolerance === 'soft' ? 0.28 : 0.2)));
  return distance(a, b) <= allowed;
}
const stopWords = new Set(['и', 'в', 'во', 'на', 'с', 'со', 'у', 'к', 'ко', 'о', 'об', 'а', 'the', 'of', 'a']);
function titleMatches(input, expected, tolerance) {
  const a = input.split(' ').filter(t => !stopWords.has(t));
  const b = expected.split(' ').filter(t => !stopWords.has(t));
  if (!a.length || !b.length || a.length !== b.length) return false;
  const used = new Set();
  return a.every(token => {
    const index = b.findIndex((candidate, i) => !used.has(i) && tokenMatches(token, candidate, tolerance));
    if (index < 0) return false;
    used.add(index); return true;
  });
}
export function checkAnswer(input, canonical, aliases = [], kind = 'title', tolerance = 'normal', knownAnswers = []) {
  const answer = normalize(input).slice(0, 180);
  if (!answer) return { accepted: false, exact: false };
  const candidates = [canonical, ...aliases].map(normalize).filter(Boolean);
  const exact = candidates.includes(answer);
  if (exact) return { accepted: true, exact: true };
  // An exact known answer for a different work/artist is not an innocent typo.
  const identity = text => text.split(' ').filter(t => t.length > 1 && !['старший', 'младший', 'др'].includes(t)).at(-1);
  const ownAnswers = kind === 'author' ? candidates.flatMap(text => [text, identity(text)]) : candidates;
  if (knownAnswers.map(normalize).includes(answer) && !ownAnswers.includes(answer)) return { accepted: false, exact: false };
  if (tolerance === 'strict') return { accepted: false, exact: false };
  const accepted = candidates.some(expected => {
    if (kind === 'author') {
      const words = expected.split(' ').filter(t => t.length > 1 && !['старший', 'младший', 'др'].includes(t));
      const entered = answer.split(' ').filter(t => t.length > 1);
      // A surname by itself is allowed; a full answer must contain the surname.
      if (expected.split(' ').includes('и')) return entered.length === words.length && words.every(word => entered.some(candidate => tokenMatches(candidate, word, tolerance)));
      const surname = words.at(-1);
      if (!surname || !entered.length || entered.length > words.length) return false;
      if (!entered.some(word => tokenMatches(word, surname, tolerance))) return false;
      return entered.every(word => words.some(candidate => tokenMatches(word, candidate, tolerance)));
    }
    return titleMatches(answer, expected, tolerance);
  });
  return { accepted, exact: false };
}
