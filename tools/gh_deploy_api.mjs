import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('NO_TOKEN'); process.exit(1); }

const SITE = process.argv[2];
const OWNER = 'fichelov';
const OLD_REPO = 'nutriline-demo';
const REPO = 'doctor-catalog';

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
  'User-Agent': 'dsh-deploy',
};

async function api(method, url, body) {
  const res = await fetch('https://api.github.com' + url, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

function walk(dir, base = dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).replace(/\\/g, '/'));
  }
  return out;
}

// 0. проверка токена
const me = await api('GET', '/user');
console.log('USER', me.status, me.data?.login);
if (me.status !== 200) process.exit(2);

// 1. переименование репозитория
const ren = await api('PATCH', `/repos/${OWNER}/${OLD_REPO}`, { name: REPO });
console.log('RENAME', ren.status, ren.data?.full_name || ren.data?.message);

// 2. инициализация пустого репозитория (Git Data API не работает на пустом репо)
const branches = await api('GET', `/repos/${OWNER}/${REPO}/branches`);
const isEmpty = !Array.isArray(branches.data) || branches.data.length === 0;
if (isEmpty) {
  const init = await api('PUT', `/repos/${OWNER}/${REPO}/contents/.init`, {
    message: 'init', content: Buffer.from('init').toString('base64'),
  });
  console.log('INIT', init.status, init.data?.commit?.sha || init.data?.message);
}

// 3. файлы -> blobs
const files = walk(SITE);
console.log('FILES', files.length);

const blobs = [];
for (const rel of files) {
  const content = fs.readFileSync(path.join(SITE, rel)).toString('base64');
  const r = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, { content, encoding: 'base64' });
  if (r.status !== 201) { console.error('BLOB_FAIL', rel, r.status, r.data?.message); process.exit(3); }
  blobs.push({ path: rel, mode: '100644', type: 'blob', sha: r.data.sha });
}
console.log('BLOBS_OK', blobs.length);

// 3. дерево
const tree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, { tree: blobs });
console.log('TREE', tree.status, tree.data?.sha);
if (tree.status !== 201) process.exit(4);

// 4. коммит
const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
  message: 'Демо приложения «Приложение для врачей»: 24 продукта, 7 памяток, дерево на 92 варианта',
  tree: tree.data.sha,
  parents: [],
});
console.log('COMMIT', commit.status, commit.data?.sha);
if (commit.status !== 201) process.exit(5);

// 5. ветка main (создать или обновить)
let ref = await api('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
  ref: 'refs/heads/main', sha: commit.data.sha,
});
if (ref.status === 422) {
  ref = await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
    sha: commit.data.sha, force: true,
  });
}
console.log('REF', ref.status, ref.data?.ref || ref.data?.message);

// 6. GitHub Pages
let pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
  source: { branch: 'main', path: '/' },
});
console.log('PAGES_CREATE', pages.status, pages.data?.html_url || pages.data?.message);

// 7. ждём сборку
for (let i = 0; i < 40; i += 1) {
  await sleep(5000);
  const b = await api('GET', `/repos/${OWNER}/${REPO}/pages/builds/latest`);
  const st = b.data?.status;
  console.log('BUILD', i, st);
  if (st === 'built') break;
  if (st === 'errored') { console.log('BUILD_ERROR', JSON.stringify(b.data)); break; }
}

const info = await api('GET', `/repos/${OWNER}/${REPO}/pages`);
console.log('PAGES_URL', info.data?.html_url);
console.log('SITE_URL', `https://${OWNER}.github.io/${REPO}/`);
process.exit(0);
