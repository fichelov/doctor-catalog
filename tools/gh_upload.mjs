import fs from 'node:fs';
import path from 'node:path';
import { connect, goto, sleep, waitFor } from './cdp-lib.mjs';

const SITE = process.argv[2] || 'C:/Users/disco/OneDrive/Документы/deepseek-harness/default-workspace/nutricare_site';
const REPO_URL = 'https://github.com/fichelov/nutriline-demo';

function walk(dir, base = dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).replace(/\\/g, '/'));
  }
  return out;
}

const paths = walk(SITE);
const payload = paths.map((p) => ({
  path: p,
  b64: fs.readFileSync(path.join(SITE, p)).toString('base64'),
}));
console.log('FILES=' + payload.length + ' BYTES=' + JSON.stringify(payload).length);

const cdp = await connect();
await goto(cdp, REPO_URL + '/upload', 5000);

const injected = await cdp.ev(`(async () => {
  const payload = ${JSON.stringify(payload)};
  const input = document.querySelector('#upload-manifest-files-input');
  if (!input) return 'NO_INPUT';
  const dt = new DataTransfer();
  for (const item of payload) {
    const bin = atob(item.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const fileName = item.path.split('/').pop();
    const file = new File([bytes], fileName, { type: 'application/octet-stream' });
    Object.defineProperty(file, 'webkitRelativePath', { value: item.path, configurable: true });
    dt.items.add(file);
  }
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return dt.files.length;
})()`, true);
console.log('INJECTED=' + injected);

const listed = await waitFor(
  cdp,
  `(() => { const t = document.body.innerText || ''; return t.includes('index.html') && t.includes('app.min.js'); })()`,
  60000
);
console.log('LISTED=' + listed);

if (!listed) {
  const body = await cdp.ev('document.body.innerText');
  console.log('BODY=' + (body || '').slice(0, 600).replace(/\n+/g, ' | '));
  cdp.close();
  process.exit(1);
}

// commit summary
await cdp.ev(`(() => {
  const el = document.querySelector('#commit-summary-input');
  if (el) { el.focus(); return true; }
  return false;
})()`);
await sleep(300);
await cdp.send('Input.insertText', { text: 'Demo: NutriLine app (44 files)' });
await sleep(400);

const clicked = await cdp.ev(`(() => {
  const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').trim() === 'Commit changes' && !b.disabled);
  if (!btn) return 'NO_BTN';
  btn.click();
  return 'OK';
})()`);
console.log('COMMIT_CLICK=' + clicked);

const done = await waitFor(cdp, `location.pathname === '/fichelov/nutriline-demo' || location.pathname.startsWith('/fichelov/nutriline-demo/tree')`, 90000);
console.log('URL=' + (await cdp.ev('location.href')));
console.log('DONE=' + done);
if (!done) {
  const body = await cdp.ev('document.body.innerText');
  console.log('BODY=' + (body || '').slice(0, 600).replace(/\n+/g, ' | '));
}
cdp.close();
process.exit(done ? 0 : 2);
