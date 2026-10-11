import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
const inlineImages = { name: 'inline-collection-images', setup(builder) { builder.onLoad({ filter: /collection\.json$/ }, async args => { const items = JSON.parse(await readFile(args.path, 'utf8')); for (const p of items) if (p.image) { const bytes = await readFile(`public/${p.image}`); const extension = p.image.split('.').at(-1).toLowerCase(); const type = extension === 'jpg' ? 'jpeg' : extension; p.image = `data:image/${type};base64,${bytes.toString('base64')}`; } return { contents: JSON.stringify(items), loader: 'json' }; }); } };
const result = await build({ entryPoints: ['src/standalone.jsx'], bundle: true, plugins: [inlineImages], write: false, minify: true, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' }, target: 'es2020' });
const css = await readFile('src/style.css', 'utf8');
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile('dist/art-memory.html', `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f6f2"><title>Артпамять</title><link rel="icon" href="icon.svg"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Автономная версия: dist/art-memory.html');
