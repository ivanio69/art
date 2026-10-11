import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, parseDelimited } from './import.js';
test('CSV supports Cyrillic headers and quoted separators', () => { const result = parseMetadata('номер;автор;название\n1;И. Репин;"Название; с точкой"'); assert.equal(result[0].id, 1); assert.equal(result[0].title, 'Название; с точкой'); });
test('Aliases and filename numbers are parsed', () => { const p = parseMetadata('id,author,title,titleAliases\n2.jpg,Моне,Впечатление,Восход солнца|Впечатление восход солнца')[0]; assert.equal(p.id, 2); assert.equal(p.titleAliases.length, 2); });
test('Duplicate ids and incomplete metadata reject whole import', () => { assert.throws(() => parseMetadata('1;A;B\n1;C;D'), /повторяется/); assert.throws(() => parseMetadata('1;;B'), /заполните/); assert.throws(() => parseDelimited('1;A;"B'), /кавычка/); });
