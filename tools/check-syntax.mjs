// Проверка синтаксиса браузерных скриптов без запуска браузера.
// Запуск: npm run lint   (или напрямую: node tools/check-syntax.mjs)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['js/app.js', 'js/data.js', 'sw.js'];

let failed = 0;
for (const rel of targets) {
  const file = join(root, rel);
  try {
    new Script(readFileSync(file, 'utf8'), { filename: file });
    console.log('ok   ' + rel);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + rel + ': ' + err.message);
  }
}

if (failed > 0) {
  console.error(failed + ' файл(ов) с ошибкой синтаксиса');
  process.exit(1);
}
console.log('OK: синтаксис браузерных скриптов корректен');
