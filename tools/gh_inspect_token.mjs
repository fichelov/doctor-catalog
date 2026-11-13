import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/settings/tokens/new', 5500);
const info = await cdp.ev(`(() => {
  const inputs = [...document.querySelectorAll('input,select')].map(el => ({
    type: el.type, id: el.id, name: el.name, value: el.type === 'checkbox' ? el.checked : el.value,
    ph: el.placeholder || ''
  })).slice(0, 60);
  const buttons = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 20);
  const body = (document.body.innerText || '').slice(0, 900);
  return JSON.stringify({ url: location.href, inputs, buttons, body }, null, 1);
})()`);
console.log(info);
cdp.close();
process.exit(0);
