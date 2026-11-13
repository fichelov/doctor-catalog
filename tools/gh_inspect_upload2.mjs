import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/fichelov/nutriline-demo/upload', 5500);
const info = await cdp.ev(`(() => {
  const inputs = [...document.querySelectorAll('input')].map(el => ({
    type: el.type, id: el.id, multiple: el.multiple, webkitdirectory: el.webkitdirectory, accept: el.accept
  }));
  const buttons = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 20);
  const body = (document.body.innerText || '').slice(0, 700);
  return JSON.stringify({ url: location.href, inputs, buttons, body }, null, 1);
})()`);
console.log(info);
cdp.close();
process.exit(0);
