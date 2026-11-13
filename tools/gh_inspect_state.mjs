import { connect } from './cdp-lib.mjs';

const cdp = await connect();
const out = await cdp.ev(`(() => {
  const name = document.querySelector('#repository-name-input');
  const visBtn = [...document.querySelectorAll('button')].find(b => /Public|Private/.test((b.innerText||'').trim()));
  const createBtn = [...document.querySelectorAll('button')].find(b => (b.innerText||'').trim() === 'Create repository');
  const errors = [...document.querySelectorAll('[class*="error"], [role="alert"], .FormControl-caption, [class*="message"]')]
    .map(e => (e.innerText||'').trim()).filter(Boolean).slice(0, 10);
  return JSON.stringify({
    url: location.href,
    nameValue: name ? name.value : null,
    visHtml: visBtn ? visBtn.outerHTML.slice(0, 400) : null,
    createDisabled: createBtn ? createBtn.disabled : null,
    errors,
    body: (document.body.innerText || '').slice(0, 600)
  }, null, 1);
})()`);
console.log(out);
cdp.close();
process.exit(0);
