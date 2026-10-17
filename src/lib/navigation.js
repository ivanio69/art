const pages = new Set(['home', 'gallery', 'history', 'errors']);
export function pageFromHash(hash = '') {
  const page = hash.replace(/^#\/?/, '');
  return pages.has(page) ? page : 'home';
}
export function pageHash(page) { return `#/${pages.has(page) ? page : 'home'}`; }
