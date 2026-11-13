import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/fichelov/nutriline-demo', 4500);
const state = await cdp.ev(`(() => {
  const t = document.body.innerText || '';
  const files = [...document.querySelectorAll('a[href*="/blob/"]')].map(a => a.innerText.trim()).slice(0, 50);
  return JSON.stringify({ url: location.href, title: document.title, empty: /quick setup|Get started by creating/i.test(t), files, head: t.slice(0, 300) }, null, 1);
})()`);
console.log(state);
cdp.close();
process.exit(0);
