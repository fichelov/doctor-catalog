// Утилиты CDP для автоматизации Edge
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9333;

export async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const pages = list.filter((t) => t.type === 'page');
  const page = pages.find((p) => !p.url.startsWith('chrome-extension://')) || pages[0];
  if (!page) throw new Error('Нет вкладок в Edge');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expression, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true, userGesture: true,
    });
    if (r.result?.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    }
    return r.result?.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return { send, ev, ws, close: () => ws.close() };
}

export async function goto(cdp, url, waitMs = 3500) {
  await cdp.send('Page.navigate', { url });
  await sleep(waitMs);
}

export async function waitFor(cdp, expr, timeoutMs = 30000, stepMs = 500) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await cdp.ev(expr)) return true;
    } catch (e) { /* страница ещё грузится */ }
    await sleep(stepMs);
  }
  return false;
}

export { sleep };
