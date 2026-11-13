import { connect, goto, sleep } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/', 4500);
const login = await cdp.ev(`(() => {
  const meta = document.querySelector('meta[name="user-login"]');
  if (meta && meta.content) return meta.content;
  const a = document.querySelector('a[data-login]');
  if (a) return a.getAttribute('data-login');
  return null;
})()`);
console.log('LOGIN=' + login);
console.log('TITLE=' + (await cdp.ev('document.title')));
const body = (await cdp.ev('document.body.innerText') || '');
console.log('SIGNED_IN=' + (/Sign out|Your repositories|Create repository/i.test(body) && !!login));
cdp.close();
process.exit(0);
