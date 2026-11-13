import { connect } from './cdp-lib.mjs';

const cdp = await connect();
const links = await cdp.ev(`(() => {
  const as = [...document.querySelectorAll('a')].map(a => ({ text: (a.innerText||'').trim().slice(0,60), href: a.getAttribute('href') }))
    .filter(x => x.href && /upload|import|new/i.test(x.href + ' ' + x.text));
  return JSON.stringify(as.slice(0, 20), null, 1);
})()`);
console.log(links);
const body = await cdp.ev('document.body.innerText');
console.log('BODY=' + (body||'').slice(0, 400).replace(/\n+/g, ' | '));
cdp.close();
process.exit(0);
