// Учебные разделы пользователя: границы определяются номерами работ, не датировкой.
export const epochs = [
  { id: '1-2', start: 1, end: 2, title: 'Искусство Древнего мира' },
  { id: '3-7', start: 3, end: 7, title: 'Античное искусство' },
  { id: '8-11', start: 8, end: 11, title: 'Средние века' },
  { id: '12-32', start: 12, end: 32, title: 'Эпоха Возрождения' },
  { id: '33-48', start: 33, end: 48, title: 'Искусство XVII в.' },
  { id: '49-57', start: 49, end: 57, title: 'Искусство XVIII в.' },
  { id: '58-79', start: 58, end: 79, title: 'Искусство XIX в.' },
  { id: '80-88', start: 80, end: 88, title: 'Искусство XX в.' },
  { id: '89-90', start: 89, end: 90, title: 'Искусство Древней Руси' },
  { id: '91-104', start: 91, end: 104, title: 'Русское искусство XVIII в.' },
  { id: '105-119', start: 105, end: 119, title: 'Русское искусство 1-й половины XIX в.' },
  { id: '120-142', start: 120, end: 142, title: 'Русское искусство 2-й половины XIX в.' },
  { id: '143-155', start: 143, end: 155, title: 'Русское искусство начала XX в.' },
  { id: '156-166', start: 156, end: 166, title: 'Советское искусство' },
  { id: '167-170', start: 167, end: 170, title: 'Белорусское искусство' },
];

export const unknownAuthor = '__unknown__';
export const epochFor = id => epochs.find(epoch => id >= epoch.start && id <= epoch.end);
export function validStudyFilters(filters) {
  return Boolean(filters && typeof filters === 'object' && !Array.isArray(filters) && typeof filters.author === 'string' && filters.author.length <= 180 && (filters.epoch === '' || epochs.some(epoch => epoch.id === filters.epoch)));
}
export function studyWorks(paintings, { author = '', epoch = '' } = {}) {
  const period = epochs.find(item => item.id === epoch);
  if (epoch && !period) return [];
  return paintings.filter(p => (!period || p.id >= period.start && p.id <= period.end) && (!author || (author === unknownAuthor ? !p.author?.trim() : p.author === author))).sort((a, b) => a.id - b.id);
}
export function studyTitle(filters) {
  if (!validStudyFilters(filters)) return '';
  return [epochs.find(epoch => epoch.id === filters.epoch)?.title, filters.author === unknownAuthor ? 'Автор не указан' : filters.author].filter(Boolean).join(' · ') || 'Все работы';
}
