import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const file = resolve('dist/art-memory.html');
if (!existsSync(file)) { console.error('Сначала выполните npm run build'); process.exit(1); }
const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
spawn(command, [file], { stdio: 'inherit' }).on('error', e => console.error(e.message));
