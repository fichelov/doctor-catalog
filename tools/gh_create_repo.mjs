import { connect, goto, sleep, waitFor } from './cdp-lib.mjs';

const REPO = 'nutriline-demo';
const cdp = await connect();
await goto(cdp, 'https://github.com/new', 5000);

// имя репозитория
const focused = await cdp.ev(`(() => {
  const el = document.querySelector('#repository-name-input');
  if (!el) return false;
  el.focus();
  return true;
})()`);
if (!focused) throw new Error('Не найдено поле имени репозитория');
await cdp.send('Input.insertText', { text: REPO });
await sleep(600);

// убедиться, что выбран Public
const visibility = await cdp.ev(`(() => {
  const btns = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim());
  const pub = btns.find(t => /^Public$/i.test(t));
  const priv = btns.find(t => /^Private$/i.test(t));
  return JSON.stringify({ pub: !!pub, priv: !!priv, all: btns.slice(0, 12) });
})()`);
console.log('VIS=' + visibility);

// описание
await cdp.ev(`(() => {
  const el = document.querySelector('input[name="Description"]');
  if (!el) return false;
  el.focus();
  return true;
})()`);
await cdp.send('Input.insertText', { text: 'Демо приложения «НУТРИЛАЙН» — каталог детских смесей для врачей' });
await sleep(400);

// создать
const clicked = await cdp.ev(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').trim() === 'Create repository');
  if (!btn) return false;
  btn.click();
  return true;
})()`);
console.log('CLICKED=' + clicked);

const ok = await waitFor(cdp, `location.pathname.includes('/${REPO}')`, 40000);
console.log('URL=' + (await cdp.ev('location.href')));
console.log('CREATED=' + ok);
cdp.close();
process.exit(0);
