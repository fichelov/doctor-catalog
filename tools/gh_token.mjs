import { connect, goto, sleep, waitFor } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://github.com/settings/tokens/new', 5500);

const boxes = await cdp.ev(`(() => {
  return JSON.stringify([...document.querySelectorAll('input[type=checkbox]')].map(el => {
    const label = el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]'));
    return { id: el.id, value: el.value, label: ((label && label.innerText) || '').trim().slice(0, 40) };
  }).slice(0, 40));
})()`);
console.log('BOXES=' + boxes);

// note
await cdp.ev(`document.querySelector('#oauth_access_description').focus()`);
await cdp.send('Input.insertText', { text: 'deploy doctor-catalog demo' });
await sleep(300);

// scope repo
const checked = await cdp.ev(`(() => {
  const boxes = [...document.querySelectorAll('input[type=checkbox]')];
  const repo = boxes.find(b => b.id === 'repo') ||
               boxes.find(b => /(^|\\s)repo(\\s|$)/i.test((b.closest('label')?.innerText) || '')) ||
               boxes.find(b => b.value === 'repo');
  if (!repo) return 'NOT_FOUND';
  repo.click();
  return repo.id || repo.value;
})()`);
console.log('SCOPE=' + checked);
await sleep(400);

const clicked = await cdp.ev(`(() => {
  const btn = [...document.querySelectorAll('button, input[type=submit]')]
    .find(b => /Generate token/i.test((b.innerText || b.value || '').trim()));
  if (!btn) return 'NO_BTN';
  btn.click();
  return 'OK';
})()`);
console.log('GENERATE=' + clicked);

await sleep(6000);
console.log('URL=' + (await cdp.ev('location.href')));
const tokenInfo = await cdp.ev(`(() => {
  const cands = [];
  document.querySelectorAll('#new-oauth-token, .token, code, input').forEach(el => {
    const v = (el.value || el.innerText || '').trim();
    if (/^(ghp_|github_pat_)/.test(v)) cands.push(v);
  });
  const body = (document.body.innerText || '');
  return JSON.stringify({ tokens: [...new Set(cands)], needPassword: /password|sudo/i.test(body) && !cands.length, body: body.slice(0, 300) });
})()`);
console.log('TOKEN=' + tokenInfo);
cdp.close();
process.exit(0);
