import { connect, sleep } from './cdp-lib.mjs';

const cdp = await connect();
const clicked = await cdp.ev(`(() => {
  const s = [...document.querySelectorAll('summary')].find(el => /delete/i.test((el.innerText || '').trim()));
  if (!s) return 'NO_SUMMARY';
  s.click();
  return 'OK';
})()`);
console.log('SUMMARY=' + clicked);
await sleep(800);

const detail = await cdp.ev(`JSON.stringify([...document.querySelectorAll('button, input[type=submit], a')]
  .map(b => (b.innerText || b.value || '').trim()).filter(Boolean).slice(0, 12))`);
console.log('CONTROLS=' + detail);

const conf = await cdp.ev(`(() => {
  const b = [...document.querySelectorAll('button, input[type=submit]')]
    .find(el => /I understand|delete this token|confirm/i.test((el.innerText || el.value || '')));
  if (!b) return 'NO_CONFIRM';
  b.click();
  return 'CLICKED';
})()`);
console.log('CONFIRM=' + conf);
await sleep(4000);

const after = await cdp.ev(`(() => ({ hasNote: (document.body.innerText || '').includes('deploy doctor-catalog'), url: location.href }))()`);
console.log('AFTER=' + JSON.stringify(after));
cdp.close();
process.exit(0);
