export function parseDelimited(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === delimiter && !quoted) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('В таблице есть незакрытая кавычка.');
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function validateMetadata(items, { allowIncomplete = false } = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Список картин пуст.');
  if (items.length > 1000) throw new Error('В одном импорте допускается до 1000 картин.');
  const seen = new Set();
  return items.map((item, i) => {
    const id = Number(String(item.id ?? item.number ?? '').replace(/\.(jpg|jpeg|png|webp)$/i, ''));
    if (!Number.isSafeInteger(id) || id < 1) throw new Error(`Строка ${i + 1}: нужен целый положительный номер картины.`);
    if (seen.has(id)) throw new Error(`Номер ${id} повторяется.`); seen.add(id);
    if (typeof item.author !== 'string' || typeof item.title !== 'string' || (!allowIncomplete && ((!item.author.trim() && item.authorRequired !== false) || !item.title.trim()))) throw new Error(`Картина №${id}: заполните автора и название.`);
    if (item.author.length > 180 || item.title.length > 180) throw new Error(`Картина №${id}: слишком длинная подпись.`);
    const aliases = name => Array.isArray(item[name]) ? item[name].filter(a => typeof a === 'string' && a.trim()).map(a => a.trim().slice(0, 180)) : typeof item[name] === 'string' ? item[name].split('|').map(a => a.trim()).filter(Boolean) : [];
    return { id, authorRequired: item.authorRequired !== false, author: item.author.trim(), title: item.title.trim(), authorAliases: aliases('authorAliases'), titleAliases: aliases('titleAliases'), note: String(item.note || '').slice(0, 2000) };
  });
}
export function parseMetadata(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    return validateMetadata(Array.isArray(data) ? data : data.paintings);
  }
  const rows = parseDelimited(trimmed);
  const header = rows[0]?.map(x => x.toLowerCase());
  const hasHeader = header?.some(x => ['id', 'номер', 'number', 'файл'].includes(x));
  const columns = hasHeader ? header : ['id', 'author', 'title', 'authoraliases', 'titlealiases', 'note'];
  const get = (row, keys) => row[columns.findIndex(column => keys.includes(column))] || '';
  return validateMetadata(rows.slice(hasHeader ? 1 : 0).map(row => ({
    id: get(row, ['id', 'номер', 'number', 'файл']), author: get(row, ['author', 'автор']), title: get(row, ['title', 'название']),
    authorAliases: get(row, ['authoraliases', 'варианты автора']), titleAliases: get(row, ['titlealiases', 'варианты названия']), note: get(row, ['note', 'заметка'])
  })));
}
