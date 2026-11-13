import { connect, goto, sleep, waitFor } from './cdp-lib.mjs';

const REPO = 'nutriline-demo';
const cdp = await connect();
await goto(cdp, 'https://github.com/new', 5500);

// 1. имя
await cdp.ev(`document.querySelector('#repository-name-input').focus()`);
await cdp.send('Input.insertText', { text: REPO });
await sleep(500);

// 2. явно выбрать Public через меню видимости
await cdp.ev(`(() => {
  const b = document.querySelector('#visibility-anchor-button');
  if (b) b.click();
  return !!b;
})()`);
await sleep(900);
const menu = await cdp.ev(`(() => {
  const items = [...document.querySelectorAll('button, [role="menuitem"], li')]
    .map(e => (e.innerText || '').trim()).filter(Boolean);
  return JSON.stringify(items.slice(0, 20));
})()`);
console.log('MENU=' + menu);

const picked = await cdp.ev(`(() => {
  const cands = [...document.querySelectorAll('[role="menuitem"], button, li')]
    .filter(e => /^Public$/i.test((e.innerText || '').trim()));
  if (!cands.length) return false;
  cands[0].click();
  return true;
})()`);
console.log('PICKED_PUBLIC=' + picked);
await sleep(700);

// 3. описание
await cdp.ev(`(() => {
  const el = document.querySelector('input[name="Description"]');
  if (el) el.focus();
  return !!el;
})()`);
await cdp.send('Input.insertText', { text: 'Демо приложения «НУТРИЛАЙН» — каталог детских смесей для врачей' });
await sleep(500);

// 4. создать
const clicked = await cdp.ev(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').trim() === 'Create repository');
  if (!btn) return false;
  btn.click();
  return true;
})()`);
console.log('CLICKED=' + clicked);

const ok = await waitFor(cdp, `location.pathname.includes('/${REPO}')`, 45000);
console.log('URL=' + (await cdp.ev('location.href')));
console.log('CREATED=' + ok);
if (!ok) {
  const body = await cdp.ev(`document.body.innerText`);
  console.log('PAGE=' + (body || '').slice(0, 500).replace(/\\n+/g, ' | '));
}
cdp.close();
process.exit(0);
