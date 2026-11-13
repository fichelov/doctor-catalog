import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/new', 5000);
const info = await cdp.ev(`(() => {
  const inputs = [...document.querySelectorAll('input,select,textarea')].map(el => ({
    tag: el.tagName, type: el.type, name: el.name, id: el.id, ph: el.placeholder || '',
    value: el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value
  }));
  const buttons = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 20);
  return JSON.stringify({ inputs, buttons, title: document.title, url: location.href }, null, 1);
})()`);
console.log(info);
cdp.close();
process.exit(0);
