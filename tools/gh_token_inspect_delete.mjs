import { connect, goto, sleep } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/settings/tokens', 5500);
const info = await cdp.ev(`(() => {
  const body = (document.body.innerText || '');
  const btns = [...document.querySelectorAll('button, a, summary')]
    .map(b => ({ text: (b.innerText || '').trim().slice(0, 40), tag: b.tagName }))
    .filter(x => /delete|удал/i.test(x.text));
  return JSON.stringify({ hasNote: body.includes('deploy doctor-catalog'), buttons: btns.slice(0, 10), url: location.href });
})()`);
console.log(info);
cdp.close();
process.exit(0);
