import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/fichelov/nutriline-demo/upload/main', 5500);
const info = await cdp.ev(`(() => {
  const inputs = [...document.querySelectorAll('input')].map(el => ({
    type: el.type, name: el.name, id: el.id, multiple: el.multiple,
    webkitdirectory: el.webkitdirectory, accept: el.accept, cls: (el.className || '').slice(0, 60)
  }));
  const buttons = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 15);
  return JSON.stringify({ url: location.href, title: document.title, inputs, buttons }, null, 1);
})()`);
console.log(info);
cdp.close();
process.exit(0);
