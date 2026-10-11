import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

async function worker() {
  const listeners = {}, entries = new Map(), messages = [];
  const key = request => new URL(typeof request === 'string' ? request : request.url, 'https://art.test').href;
  let online = true;
  runInNewContext(await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL, console,
    self: { location: { origin: 'https://art.test' }, addEventListener: (name, callback) => { listeners[name] = callback; } },
    caches: { open: async () => ({ match: async request => entries.get(key(request))?.clone(), put: async (request, response) => { entries.set(key(request), response); } }) },
    fetch: async url => { if (!online) throw Error('Offline'); return new Response(key(url), { status: String(url).includes('missing') ? 404 : 200 }); },
  });
  return { entries, messages, offline: () => { online = false; }, save: async urls => { let pending; listeners.message({ data: { type: 'SAVE_OFFLINE', urls }, ports: [{ postMessage: message => messages.push(message) }], waitUntil: promise => { pending = promise; } }); await pending; }, load: async (url, mode = 'cors', headers = new Headers()) => { let pending; listeners.fetch({ request: { url: key(url), method: 'GET', mode, headers }, respondWith: promise => { pending = promise; } }); return pending; } };
}
test('Saved shell, application assets and paintings can be served without a network', async () => {
  const sw = await worker(); await sw.save(['/', '/_next/static/app.js', '/paintings/1.jpg']);
  assert.equal(sw.messages.at(-1).failed, 0); sw.offline();
  assert.match(await (await sw.load('/', 'navigate')).text(), /art.test/);
  assert.match(await (await sw.load('/_next/static/app.js')).text(), /app.js/);
  assert.match(await (await sw.load('/paintings/1.jpg')).text(), /1.jpg/);
});
test('Offline saves report failed assets and ignore cross-origin or unsupported paths', async () => {
  const sw = await worker(); await sw.save(['/paintings/missing.jpg', 'https://other.test/private', '/api/private']);
  assert.equal(sw.messages.at(-1).failed, 1); assert.equal(sw.entries.size, 0);
  assert.equal(await sw.load('/api/private'), undefined);
  assert.equal(await sw.load('/', 'cors', new Headers({ rsc: '1' })), undefined);
});
