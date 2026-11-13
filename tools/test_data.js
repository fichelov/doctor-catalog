/* Проверка целостности данных приложения «Приложение для врачей» */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(dir, 'js', 'data.js'), 'utf8') +
  '\nthis.NC = NC; this.NC_RULES = NC_RULES;',
  ctx
);
const NC = ctx.NC;
const RULES = ctx.NC_RULES;

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

// продукты
ok(NC.products.length === 24, `продуктов ${NC.products.length}, ожидалось 24`);
const ids = new Set();
NC.products.forEach((p) => {
  ok(!ids.has(p.id), `дубликат id: ${p.id}`);
  ids.add(p.id);
  ok(NC.categories.some((c) => c.id === p.category), `${p.id}: неизвестная категория ${p.category}`);
  ok(fs.existsSync(path.join(dir, 'assets', 'covers', p.id + '.svg')), `${p.id}: нет обложки`);
  ok(p.table.length >= 4, `${p.id}: мало характеристик`);
  p.table.forEach((row, i) => ok(row.length === 4, `${p.id}: строка ${i} не 4 колонки`));
  ok(p.short && p.composition && p.indication, `${p.id}: неполный текст`);
});
NC.categories.forEach((c) => {
  const n = NC.products.filter((p) => p.category === c.id).length;
  ok(n > 0, `категория ${c.id} без продуктов`);
});

// памятки
ok(NC.memos.length === 7, `памяток ${NC.memos.length}, ожидалось 7`);
NC.memos.forEach((m) => {
  ok(fs.existsSync(path.join(dir, m.file.replace(/^assets\//, 'assets/'))), `${m.id}: нет файла ${m.file}`);
  ok(fs.existsSync(path.join(dir, 'assets', 'memos', m.id + '.pdf')), `${m.id}: нет PDF`);
});

// уведомления и коды
ok(NC.notifications.length >= 4, 'мало уведомлений');
ok(NC.demo.codes.length >= 1, 'нет демо-кодов');

// дерево: 92 листа и валидные продукты на выходе
let leaves = 0;
function walk(situation, qi, answers) {
  const s = situation;
  if (qi >= s.questions.length) {
    leaves += 1;
    const pid = RULES[s.id](answers);
    ok(!!NC.products.find((p) => p.id === pid), `${s.id}: неверный продукт ${pid} для ${JSON.stringify(answers)}`);
    return;
  }
  const q = s.questions[qi];
  q.options.forEach((o) => walk(s, qi + 1, Object.assign({}, answers, { [q.id]: o.value })));
}
NC.tree.situations.forEach((s) => walk(s, 0, {}));
ok(leaves === 92, `вариантов перехода ${leaves}, ожидалось 92`);

if (errors.length) {
  console.error('ОШИБКИ:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}
console.log('OK: 24 продукта, 7 памяток, 92 варианта перехода, все ссылки валидны');
