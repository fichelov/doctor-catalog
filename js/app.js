/* ============================================================
   Приложение для врачей — приложение (демо)
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------- утилиты --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const app = () => document.getElementById('app');

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const state = loadState();
  let deferredPrompt = null;

  // Туннель не пропускает большие файлы — PDF там собираются по частям.
  // На обычном хостинге (GitHub Pages и т.п.) открываем PDF напрямую.
  const CHUNKED_PDF = /\.(lhr\.life|trycloudflare\.com|serveousercontent\.com)$/.test(location.hostname);

  function loadState() {
    try {
      const raw = localStorage.getItem('nc_state_v1');
      const base = { user: null, readNotifs: [], verifyCode: null, welcomeSeen: false };
      return raw ? Object.assign(base, JSON.parse(raw)) : base;
    } catch (e) { return { user: null, readNotifs: [], verifyCode: null, welcomeSeen: false }; }
  }
  function saveState() {
    try { localStorage.setItem('nc_state_v1', JSON.stringify(state)); } catch (e) {}
  }
  function users() {
    try { return JSON.parse(localStorage.getItem('nc_users_v1') || '{}'); } catch (e) { return {}; }
  }
  function saveUsers(u) {
    try { localStorage.setItem('nc_users_v1', JSON.stringify(u)); } catch (e) {}
  }

  const catById = (id) => NC.categories.find((c) => c.id === id) || NC.categories[0];
  const productById = (id) => NC.products.find((p) => p.id === id);
  const cover = (p) => `assets/covers/${p.id}.svg`;
  const initials = (name) => (name || 'В').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const firstName = (name) => {
    if (!name) return 'доктор';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 3 ? parts[1] : parts[0];
  };
  const unreadCount = () => NC.notifications.filter((n) => !state.readNotifs.includes(n.id)).length;
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  /* --------------------------- иконки --------------------------- */
  const P = (d, extra = '') => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;
  const ICON = {
    back: P('<path d="M15 18l-6-6 6-6"/>'),
    chevron: P('<path d="M9 6l6 6-6 6"/>'),
    bell: P('<path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    share: P('<path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>'),
    lock: P('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>'),
    mail: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    grid: P('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    book: P('<path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2z"/><path d="M8 7h7"/><path d="M8 11h7"/>'),
    branch: P('<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8.4 6H13a3 3 0 013 3v1"/><path d="M8.4 18H13a3 3 0 003-3v-1"/>'),
    doc: P('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>'),
    download: P('<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>'),
    logout: P('<path d="M15 17l5-5-5-5"/><path d="M20 12H9"/><path d="M13 4H6a2 2 0 00-2 2v12a2 2 0 002 2h7"/>'),
    info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
    shield: P('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9.5 12l1.8 1.8 3.4-3.4"/>'),
    drop: P('<path d="M12 3s6 6.2 6 10a6 6 0 01-12 0c0-3.8 6-10 6-10z"/>'),
    spoon: P('<ellipse cx="8" cy="8" rx="4.2" ry="5.2" transform="rotate(-35 8 8)"/><path d="M11 11l8 8"/>'),
    wave: P('<path d="M3 8c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3 2.5-3 3-3"/><path d="M3 15c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3 2.5-3 3-3"/>'),
    cross: P('<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/>'),
    heart: P('<path d="M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z"/>'),
    leaf: P('<path d="M4 20C4 11 10 4 20 4c0 10-7 16-16 16z"/><path d="M4 20c4-6 8-9 12-11"/>'),
    star: P('<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8z"/>'),
    settings: P('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z"/>'),
    check: P('<path d="M4 12.5l5 5L20 6.5"/>'),
    install: P('<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 7v7"/><path d="M9 11l3 3 3-3"/>'),
    close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  };

  const CAT_ICON = {
    standard: ICON.spoon, antireflux: ICON.wave, hypoallergenic: ICON.shield,
    therapeutic: ICON.cross, lactosefree: ICON.drop, preterm: ICON.heart,
    fermented: ICON.leaf, special: ICON.star,
  };
  const SIT_ICON = { lactation: ICON.drop, 'no-milk': ICON.spoon, switch: ICON.leaf, special: ICON.heart };

  /* --------------------------- тосты и модалки --------------------------- */
  let toastTimer = null;
  function toast(message) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      app().appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  function openModal(title, text) {
    let m = $('#modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'modal';
      m.className = 'modal';
      m.innerHTML = '<div class="modal__sheet"><div class="modal__grip"></div>' +
        '<div class="modal__title" id="modal-title"></div>' +
        '<div class="modal__text" id="modal-text"></div>' +
        '<div style="height:16px"></div>' +
        '<button class="btn btn--soft" data-modal-close>Понятно</button></div>';
      app().appendChild(m);
      m.addEventListener('click', (e) => {
        if (e.target === m || e.target.closest('[data-modal-close]')) m.classList.remove('is-open');
      });
    }
    $('#modal-title', m).textContent = title;
    $('#modal-text', m).textContent = text;
    m.classList.add('is-open');
  }

  async function share(payload) {
    const url = payload.url || location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url });
        return;
      } catch (e) { /* пользователь отменил — идём в буфер */ }
    }
    try {
      await navigator.clipboard.writeText(`${payload.text ? payload.text + '\n' : ''}${url}`);
      toast('Ссылка скопирована');
    } catch (e) {
      toast('Ссылка: ' + url);
    }
  }

  /* --------------------------- навигация --------------------------- */
  function go(hash) { location.hash = hash; }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go]');
    if (el) {
      e.preventDefault();
      go(el.getAttribute('data-go'));
    }
  });

  /* --------------------------- шапки --------------------------- */
  function topbar(title, { back = null, action = '' } = {}) {
    return `<div class="topbar">
      ${back ? `<button class="topbar__back" data-go="${back}" aria-label="Назад">${ICON.back}</button>` : ''}
      <div class="topbar__title">${esc(title)}</div>
      <div class="topbar__action">${action}</div>
    </div>`;
  }

  function bottomNav(active) {
    const items = [
      { id: 'home', label: 'Главная', icon: ICON.grid, href: '#/home' },
      { id: 'catalog', label: 'Каталог', icon: ICON.spoon, href: '#/catalog' },
      { id: 'memos', label: 'Памятки', icon: ICON.book, href: '#/memos' },
      { id: 'profile', label: 'Профиль', icon: ICON.user, href: '#/profile' },
    ];
    return `<nav class="nav">${items.map((it) => `
      <button class="nav__item ${active === it.id ? 'is-active' : ''}" data-go="${it.href}">
        ${it.icon}<span>${it.label}</span>
      </button>`).join('')}</nav>`;
  }

  /* ============================================================
     ЭКРАНЫ
     ============================================================ */

  /* ---------- welcome ---------- */
  function viewWelcome() {
    return `<div class="screen welcome">
      <div class="welcome__top">
        <div class="welcome__logo">Н</div>
        <div class="welcome__brand">ПРИЛОЖЕНИЕ ДЛЯ ВРАЧЕЙ<small>Каталог детских смесей</small></div>
        <div class="welcome__spacer"></div>
      </div>
      <div class="welcome__main">
        <div class="eyebrow">Только для врачей</div>
        <h1 class="display">Смеси,<br>которым доверяют</h1>
        <p class="welcome__sub">Закрытый каталог детских смесей: ассортимент, памятки и пошаговый алгоритм подбора.</p>
        <div class="welcome__features">
          <div class="feat"><span class="feat__ico">${ICON.spoon}</span>24 продукта с полными характеристиками</div>
          <div class="feat"><span class="feat__ico">${ICON.book}</span>Памятки для родителей в PDF</div>
          <div class="feat"><span class="feat__ico">${ICON.branch}</span>Подбор за 3 вопроса — 92 сценария</div>
        </div>
      </div>
      <div class="welcome__actions">
        <button class="btn btn--primary" data-go="#/code">Войти по коду доступа</button>
        <button class="btn btn--ghost" data-go="#/login">Вход по логину и паролю</button>
        <button class="btn btn--link" data-go="#/register">Регистрация специалиста</button>
        <div class="welcome__legal">Доступ предоставляется после подтверждения квалификации.<br>Материалы носят информационный характер.</div>
      </div>
    </div>`;
  }

  /* ---------- ввод кода ---------- */
  function viewCode() {
    return `<div class="screen">
      ${topbar('Доступ', { back: '#/welcome' })}
      <div class="screen__body screen__body--no-nav">
        <div class="codebox">
          <div class="eyebrow">Первый вход</div>
          <div class="codebox__title">Введите код доступа</div>
          <p class="muted small">Код-ключ передают медицинские представители компании. Валидация выполняется онлайн.</p>
          <div class="demo-hint">${ICON.info}<span>Демо-код: <b>${NC.demo.codes[0]}</b></span></div>
          <form id="code-form" class="form" novalidate>
            <div class="field">
              <input class="input input--code" id="code-input" name="code" placeholder="NTL-XXXX-XXXX" autocomplete="off" spellcheck="false" maxlength="16">
            </div>
            <div class="form__error" id="code-error"></div>
            <button class="btn btn--primary" type="submit" id="code-submit">Активировать</button>
          </form>
          <button class="btn btn--link" data-go="#/login">У меня уже есть аккаунт</button>
        </div>
      </div>
    </div>`;
  }
  function mountCode() {
    const form = $('#code-form');
    const input = $('#code-input');
    const err = $('#code-error');
    const btn = $('#code-submit');
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      input.classList.remove('input--error');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim().toUpperCase();
      err.classList.remove('is-visible');
      if (!value) {
        err.textContent = 'Введите код из письма или от представителя компании.';
        err.classList.add('is-visible');
        return;
      }
      if (!navigator.onLine) {
        err.textContent = 'Нет соединения. Валидация кода возможна только онлайн.';
        err.classList.add('is-visible');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Проверяем…';
      setTimeout(() => {
        const ok = NC.demo.codes.map((c) => c.toUpperCase()).includes(value);
        if (!ok) {
          btn.disabled = false;
          btn.textContent = 'Активировать';
          err.textContent = 'Код не найден. Проверьте написание или обратитесь к представителю компании.';
          err.classList.add('is-visible');
          input.classList.add('input--error');
          return;
        }
        state.user = Object.assign({}, state.user, { code: value, verified: false });
        saveState();
        toast('Код принят');
        go('#/register');
      }, 800);
    });
  }

  /* ---------- вход ---------- */
  function viewLogin() {
    return `<div class="screen">
      ${topbar('Вход', { back: '#/welcome' })}
      <div class="screen__body screen__body--no-nav">
        <div class="codebox">
          <h1>Вход в приложение</h1>
          <p class="muted small">Введите логин и пароль, указанные при регистрации.</p>
          <div class="demo-hint">${ICON.info}<span>Демо-доступ: <b>doctor</b> / <b>doctor1234</b></span></div>
          <form id="login-form" class="form" novalidate>
            <div class="field">
              <div class="field__label">Логин</div>
              <input class="input" id="login-name" autocapitalize="none" autocomplete="username">
            </div>
            <div class="field">
              <div class="field__label">Пароль</div>
              <input class="input" id="login-pass" type="password" autocomplete="current-password">
            </div>
            <div class="form__error" id="login-error"></div>
            <button class="btn btn--primary" type="submit">Войти</button>
          </form>
          <button class="btn btn--soft" id="biometric">
            ${ICON.lock}<span>Войти с Face ID / Touch ID</span>
          </button>
          <button class="btn btn--link" data-go="#/recovery">Забыли пароль?</button>
          <button class="btn btn--link" data-go="#/code">Войти по коду доступа</button>
        </div>
      </div>
    </div>`;
  }
  function mountLogin() {
    const form = $('#login-form');
    const err = $('#login-error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const login = $('#login-name').value.trim();
      const pass = $('#login-pass').value;
      err.classList.remove('is-visible');
      const db = users();
      const demo = NC.demo.login;
      const account = db[login.toLowerCase()] ||
        (login.toLowerCase() === demo.login && pass === demo.password
          ? { name: demo.name, email: demo.email, login: demo.login, password: demo.password, verified: true }
          : null);
      if (!account || account.password !== pass) {
        err.textContent = 'Неверный логин или пароль.';
        err.classList.add('is-visible');
        return;
      }
      state.user = { name: account.name, email: account.email, login: account.login, verified: !!account.verified };
      saveState();
      go('#/home');
    });
    $('#biometric').addEventListener('click', () => {
      const db = users();
      const any = Object.values(db)[0];
      if (any) {
        state.user = { name: any.name, email: any.email, login: any.login, verified: true };
        saveState();
        toast('Вход по биометрии выполнен');
        go('#/home');
      } else {
        toast('Биометрия настраивается в профиле после регистрации');
      }
    });
  }

  /* ---------- регистрация ---------- */
  function viewRegister() {
    const u = state.user || {};
    return `<div class="screen">
      ${topbar('Регистрация', { back: state.user && state.user.code ? '#/code' : '#/welcome' })}
      <div class="screen__body screen__body--no-nav">
        <div class="codebox">
          <div class="eyebrow">Шаг 2 из 3</div>
          <h1>Первичная регистрация</h1>
          <p class="muted small">Данные нужны для восстановления доступа и подтверждения квалификации специалиста.</p>
          <form id="reg-form" class="form" novalidate>
            <div class="field">
              <div class="field__label">ФИО специалиста</div>
              <input class="input" id="reg-name" autocomplete="name" value="${esc(u.name || '')}" placeholder="Иванова Анна Сергеевна">
            </div>
            <div class="field">
              <div class="field__label">Email</div>
              <input class="input" id="reg-email" type="email" inputmode="email" autocapitalize="none" autocomplete="email" value="${esc(u.email || '')}" placeholder="doctor@clinic.ru">
            </div>
            <div class="field">
              <div class="field__label">Логин</div>
              <input class="input" id="reg-login" autocapitalize="none" autocomplete="username" value="${esc(u.login || '')}" placeholder="ivanova">
            </div>
            <div class="field">
              <div class="field__label">Пароль</div>
              <input class="input" id="reg-pass" type="password" autocomplete="new-password" placeholder="Минимум 8 символов">
            </div>
            <label class="check">
              <input type="checkbox" id="reg-consent">
              <span>Согласен на обработку персональных данных и принимаю политику конфиденциальности</span>
            </label>
            <div class="form__error" id="reg-error"></div>
            <button class="btn btn--primary" type="submit">Зарегистрироваться</button>
          </form>
          <div class="footer-note">Шаг 3 — подтверждение email для восстановления доступа.</div>
        </div>
      </div>
    </div>`;
  }
  function mountRegister() {
    const form = $('#reg-form');
    const err = $('#reg-error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#reg-name').value.trim();
      const email = $('#reg-email').value.trim();
      const login = $('#reg-login').value.trim().toLowerCase();
      const pass = $('#reg-pass').value;
      const consent = $('#reg-consent').checked;
      const fail = (msg) => { err.textContent = msg; err.classList.add('is-visible'); };
      err.classList.remove('is-visible');
      if (name.split(/\s+/).length < 2) return fail('Укажите фамилию и имя специалиста.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Проверьте адрес email.');
      if (!/^[a-z0-9._-]{3,20}$/.test(login)) return fail('Логин: 3–20 символов, латиница, цифры, точка, дефис.');
      if (pass.length < 8) return fail('Пароль должен содержать минимум 8 символов.');
      if (!consent) return fail('Необходимо согласие на обработку персональных данных.');
      const db = users();
      db[login] = { name, email, login, password: pass, verified: false };
      saveUsers(db);
      state.user = { name, email, login, verified: false };
      state.verifyCode = String(Math.floor(1000 + Math.random() * 9000));
      saveState();
      go('#/verify');
    });
  }

  /* ---------- подтверждение email ---------- */
  function viewVerify() {
    const u = state.user || {};
    return `<div class="screen">
      ${topbar('Подтверждение', { back: '#/register' })}
      <div class="screen__body screen__body--no-nav">
        <div class="codebox">
          <div class="eyebrow">Шаг 3 из 3</div>
          <h1>Подтвердите email</h1>
          <p class="muted small">Мы отправили код на <b>${esc(u.email || '—')}</b>. Подтверждение нужно, чтобы восстановить доступ после переустановки приложения.</p>
          <div class="demo-hint">${ICON.info}<span>Демо-код: <b>${esc(state.verifyCode || '0000')}</b></span></div>
          <form id="verify-form" class="form" novalidate>
            <input class="input input--code" id="verify-input" inputmode="numeric" maxlength="4" placeholder="••••">
            <div class="form__error" id="verify-error"></div>
            <button class="btn btn--primary" type="submit">Подтвердить</button>
          </form>
          <button class="btn btn--link" id="resend">Отправить код повторно</button>
        </div>
      </div>
    </div>`;
  }
  function mountVerify() {
    const form = $('#verify-form');
    const err = $('#verify-error');
    $('#resend').addEventListener('click', () => {
      state.verifyCode = String(Math.floor(1000 + Math.random() * 9000));
      saveState();
      render();
      toast('Код отправлен повторно');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = $('#verify-input').value.trim();
      err.classList.remove('is-visible');
      if (val !== state.verifyCode) {
        err.textContent = 'Неверный код. Проверьте письмо или запросите новый.';
        err.classList.add('is-visible');
        return;
      }
      state.user.verified = true;
      const db = users();
      if (state.user.login && db[state.user.login]) {
        db[state.user.login].verified = true;
        saveUsers(db);
      }
      saveState();
      toast('Email подтверждён');
      go('#/home');
    });
  }

  /* ---------- восстановление пароля ---------- */
  let recovery = { step: 1, email: '', code: null };
  function viewRecovery() {
    if (recovery.step === 2) {
      return `<div class="screen">
        ${topbar('Восстановление', { back: '#/login' })}
        <div class="screen__body screen__body--no-nav">
          <div class="codebox">
            <h1>Новый пароль</h1>
            <p class="muted small">Код отправлен на <b>${esc(recovery.email)}</b>.</p>
            <div class="demo-hint">${ICON.info}<span>Демо-код: <b>${esc(recovery.code)}</b></span></div>
            <form id="reset-form" class="form" novalidate>
              <input class="input input--code" id="reset-code" maxlength="4" inputmode="numeric" placeholder="Код из письма">
              <input class="input" id="reset-pass" type="password" placeholder="Новый пароль, минимум 8 символов">
              <div class="form__error" id="reset-error"></div>
              <button class="btn btn--primary" type="submit">Сохранить пароль</button>
            </form>
          </div>
        </div>
      </div>`;
    }
    return `<div class="screen">
      ${topbar('Восстановление', { back: '#/login' })}
      <div class="screen__body screen__body--no-nav">
        <div class="codebox">
          <h1>Восстановление доступа</h1>
          <p class="muted small">Укажите email, указанный при регистрации, — отправим код подтверждения.</p>
          <form id="rec-form" class="form" novalidate>
            <input class="input" id="rec-email" type="email" autocapitalize="none" placeholder="doctor@clinic.ru">
            <div class="form__error" id="rec-error"></div>
            <button class="btn btn--primary" type="submit">Отправить код</button>
          </form>
        </div>
      </div>
    </div>`;
  }
  function mountRecovery() {
    if (recovery.step === 2) {
      $('#reset-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = $('#reset-code').value.trim();
        const pass = $('#reset-pass').value;
        const err = $('#reset-error');
        err.classList.remove('is-visible');
        if (code !== recovery.code) { err.textContent = 'Неверный код.'; err.classList.add('is-visible'); return; }
        if (pass.length < 8) { err.textContent = 'Пароль должен содержать минимум 8 символов.'; err.classList.add('is-visible'); return; }
        const db = users();
        const login = Object.keys(db).find((k) => db[k].email.toLowerCase() === recovery.email.toLowerCase());
        if (login) { db[login].password = pass; saveUsers(db); }
        recovery = { step: 1, email: '', code: null };
        toast('Пароль обновлён');
        go('#/login');
      });
      return;
    }
    $('#rec-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#rec-email').value.trim();
      const err = $('#rec-error');
      err.classList.remove('is-visible');
      const db = users();
      const found = Object.values(db).some((u) => u.email.toLowerCase() === email.toLowerCase()) ||
        email.toLowerCase() === NC.demo.login.email.toLowerCase();
      if (!found) { err.textContent = 'Пользователь с таким email не найден.'; err.classList.add('is-visible'); return; }
      recovery = { step: 2, email, code: String(Math.floor(1000 + Math.random() * 9000)) };
      render();
    });
  }

  /* ---------- главный экран ---------- */
  function viewHome() {
    const u = state.user || {};
    const unread = unreadCount();
    return `<div class="screen">
      <div class="brandbar">
        <div class="brandbar__logo">Н</div>
        <div>
          <div class="brandbar__title">ПРИЛОЖЕНИЕ</div>
          <div class="brandbar__sub">для врачей · каталог смесей</div>
        </div>
        <div class="brandbar__spacer"></div>
        <button class="iconbtn" data-go="#/notifications" aria-label="Уведомления">
          ${ICON.bell}${unread ? '<span class="iconbtn__dot"></span>' : ''}
        </button>
      </div>
      <div class="screen__body screen__body--flat">
        <div class="hero">
          <div class="hero__hello">Здравствуйте${u.name ? ', ' + esc(firstName(u.name)) : ''}!</div>
          <h1>Что нужно сегодня?</h1>
        </div>
        <button class="banner" data-notice>
          <span class="banner__icon">${ICON.info}</span>
          <span>
            <span class="banner__title">ВАЖНОЕ ЗАМЕЧАНИЕ</span>
            <span class="banner__text">Приложение — справочник для специалистов и не заменяет назначение врача.</span>
          </span>
        </button>
        <div class="sections">
          <button class="section-card" data-go="#/catalog">
            <span class="section-card__icon">${ICON.spoon}</span>
            <span>
              <span class="section-card__title">Ассортимент</span>
              <span class="section-card__meta">Карточки продуктов, состав, характеристики</span>
            </span>
            <span class="section-card__count">${NC.products.length}</span>
          </button>
          <button class="section-card" data-go="#/memos">
            <span class="section-card__icon">${ICON.book}</span>
            <span>
              <span class="section-card__title">Памятки</span>
              <span class="section-card__meta">PDF-материалы для родителей</span>
            </span>
            <span class="section-card__count">${NC.memos.length}</span>
          </button>
          <button class="section-card" data-go="#/tree">
            <span class="section-card__icon">${ICON.branch}</span>
            <span>
              <span class="section-card__title">Алгоритм выбора</span>
              <span class="section-card__meta">Дерево решений за три вопроса</span>
            </span>
            <span class="section-card__count">92</span>
          </button>
        </div>
        <div class="block" style="margin-top:6px">
          <div class="block__title">Последние обновления</div>
          <div class="list">
            ${NC.notifications.slice(0, 2).map((n) => `
              <button class="row" data-go="#/notifications">
                <span class="row__icon ${n.type === 'important' ? 'row__icon--pdf' : ''}">${n.type === 'update' ? ICON.clock : ICON.doc}</span>
                <span class="row__main">
                  <span class="row__title">${esc(n.title)}</span>
                  <span class="row__sub">${esc(fmtDate(n.date))}</span>
                </span>
                <span class="row__chev">${ICON.chevron}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="footer-note">Демонстрационная версия · ${esc(NC.brand.version)}</div>
      </div>
      ${bottomNav('home')}
    </div>`;
  }

  /* ---------- каталог ---------- */
  let catalogFilter = { q: '', cat: 'all' };
  function productTile(p) {
    const c = catById(p.category);
    return `<button class="tile" data-go="#/product/${p.id}">
      <span class="tile__cover">
        <img src="${cover(p)}" alt="${esc(p.name)}" loading="lazy">
        <span class="tile__badge">${esc(p.age)}</span>
      </span>
      <span class="tile__body">
        <span class="tile__name">${esc(p.name)}</span>
        <span class="tile__meta">${esc(c.title)}</span>
      </span>
    </button>`;
  }
  function viewCatalog() {
    return `<div class="screen">
      ${topbar('Ассортимент', { back: '#/home' })}
      <div class="screen__body screen__body--flat">
        <div class="toolbar">
          <div class="search">${ICON.search}<input id="catalog-search" placeholder="Поиск по названию и описанию" value="${esc(catalogFilter.q)}"></div>
        </div>
        <div class="chips" id="chips">
          <button class="chip ${catalogFilter.cat === 'all' ? 'is-active' : ''}" data-cat="all">Все</button>
          ${NC.categories.map((c) => `<button class="chip ${catalogFilter.cat === c.id ? 'is-active' : ''}" data-cat="${c.id}">${esc(c.title)}</button>`).join('')}
        </div>
        <div class="tiny muted" id="catalog-count"></div>
        <div class="grid" id="catalog-grid"></div>
      </div>
      ${bottomNav('catalog')}
    </div>`;
  }
  function renderCatalogGrid() {
    const q = catalogFilter.q.trim().toLowerCase();
    const items = NC.products.filter((p) => {
      const okCat = catalogFilter.cat === 'all' || p.category === catalogFilter.cat;
      const hay = `${p.name} ${p.short} ${p.subtitle} ${p.tags.join(' ')}`.toLowerCase();
      return okCat && (!q || hay.includes(q));
    });
    const grid = $('#catalog-grid');
    const count = $('#catalog-count');
    if (!grid) return;
    count.textContent = items.length ? `Найдено: ${items.length}` : '';
    grid.innerHTML = items.length ? items.map(productTile).join('') :
      `<div class="empty" style="grid-column:1/-1">
        <span class="empty__ico">${ICON.search}</span>
        Ничего не найдено. Попробуйте другой запрос или категорию.
      </div>`;
  }
  function mountCatalog() {
    renderCatalogGrid();
    $('#catalog-search').addEventListener('input', (e) => {
      catalogFilter.q = e.target.value;
      renderCatalogGrid();
    });
    $('#chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      catalogFilter.cat = chip.getAttribute('data-cat');
      $$('#chips .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
      renderCatalogGrid();
    });
  }

  /* ---------- карточка продукта ---------- */
  function viewProduct(id) {
    const p = productById(id);
    if (!p) return `<div class="screen">${topbar('Продукт', { back: '#/catalog' })}<div class="screen__body screen__body--no-nav"><div class="empty">Продукт не найден</div></div></div>`;
    const c = catById(p.category);
    return `<div class="screen">
      ${topbar('Карточка продукта', {
        back: '#/catalog',
        action: `<button class="iconbtn" id="share-product" aria-label="Поделиться">${ICON.share}</button>`,
      })}
      <div class="screen__body screen__body--no-nav">
        <div class="cover"><img src="${cover(p)}" alt="${esc(p.name)}"></div>
        <div>
          <div class="eyebrow" style="color:${c.accent}">${esc(c.title)}</div>
          <h1 style="margin-top:4px">${esc(p.name)}</h1>
          <p class="muted small" style="margin-top:4px">${esc(p.subtitle)}</p>
        </div>
        <div class="tags">
          ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
          <span class="tag tag--soft">${esc(p.age)}</span>
        </div>
        <div class="block">
          <div class="block__title">Краткое описание</div>
          <p class="small" style="color:var(--ink-2)">${esc(p.short)}</p>
        </div>
        <div class="block">
          <div class="block__title">Состав</div>
          <p class="small" style="color:var(--ink-2)">${esc(p.composition)}</p>
        </div>
        <div class="block">
          <div class="block__title">Характеристики</div>
          <table class="spec">
            <thead><tr><th>Показатель</th><th>Значение</th><th>Ед.</th><th>Комментарий</th></tr></thead>
            <tbody>
              ${p.table.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="block">
          <div class="block__title">Показания к применению</div>
          <p class="small" style="color:var(--ink-2)">${esc(p.indication)}</p>
        </div>
        <div class="actions">
          <button class="btn btn--primary" id="share-product-2">${ICON.share}<span>Поделиться</span></button>
          <button class="btn btn--ghost" data-go="#/tree">${ICON.branch}<span>Подобрать</span></button>
        </div>
        <div class="footer-note">Информация для специалистов. Перед применением ознакомьтесь с инструкцией производителя.</div>
      </div>
    </div>`;
  }
  function mountProduct(id) {
    const p = productById(id);
    if (!p) return;
    const doShare = () => share({
      title: p.name,
      text: `${p.name} — ${p.subtitle}`,
      url: `${location.origin}${location.pathname}#/product/${p.id}`,
    });
    const a = $('#share-product');
    const b = $('#share-product-2');
    if (a) a.addEventListener('click', doShare);
    if (b) b.addEventListener('click', doShare);
  }

  /* ---------- памятки ---------- */
  function viewMemos() {
    return `<div class="screen">
      ${topbar('Памятки', { back: '#/home' })}
      <div class="screen__body screen__body--flat">
        <p class="muted small">Материалы для родителей. Можно открыть и поделиться через мессенджеры или email.</p>
        <div class="list">
          ${NC.memos.map((m) => `
            <div class="row" style="align-items:flex-start">
              <span class="row__icon row__icon--pdf">${ICON.doc}</span>
              <span class="row__main">
                <span class="row__title">${esc(m.title)}</span>
                <span class="row__sub">${esc(m.subtitle)}</span>
                <span class="row__sub">${m.pages} стр. · ${esc(m.size)} · PDF</span>
                <span style="display:flex; gap:8px; margin-top:9px">
                  <button class="btn btn--soft btn--sm" data-open-memo="${m.id}">${ICON.doc} Открыть</button>
                  <button class="btn btn--ghost btn--sm" data-memo="${m.id}">${ICON.share} Поделиться</button>
                </span>
              </span>
            </div>`).join('')}
        </div>
        <div class="footer-note">Ориентировочно 5–10 памяток · материалы предоставляет компания</div>
      </div>
      ${bottomNav('memos')}
    </div>`;
  }
  async function openMemoPdf(memo, btn) {
    if (!CHUNKED_PDF) {
      window.open(memo.file, '_blank');
      return;
    }
    const CHUNK = 4096;
    const total = memo.bytes || 0;
    const count = Math.ceil(total / CHUNK);
    if (!count) { toast('Файл памятки недоступен'); return; }
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="border-color:rgba(14,110,104,.3);border-top-color:#0E6E68"></span> Загрузка…';
    try {
      const parts = [];
      const fetchChunk = async (i) => {
        let lastErr = null;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            const res = await fetch(`${memo.file}?chunk=${i}&size=${CHUNK}&t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
              const buf = new Uint8Array(await res.arrayBuffer());
              if (buf.length) return buf;
            }
            lastErr = new Error('chunk ' + i + ' status ' + res.status);
          } catch (e) { lastErr = e; }
          await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        }
        throw lastErr || new Error('chunk ' + i);
      };
      for (let i = 0; i < count; i += 1) {
        parts.push(await fetchChunk(i));
        if (i % 5 === 0) btn.innerHTML = `<span class="spinner" style="border-color:rgba(14,110,104,.3);border-top-color:#0E6E68"></span> ${Math.round((i / count) * 100)}%`;
      }
      const blob = new Blob(parts, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url; a.download = memo.id + '.pdf'; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      toast('Памятка открыта');
    } catch (e) {
      toast('Не удалось загрузить памятку');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  function mountMemos() {
    $$('[data-open-memo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = NC.memos.find((x) => x.id === btn.getAttribute('data-open-memo'));
        if (m) openMemoPdf(m, btn);
      });
    });
    $$('[data-memo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = NC.memos.find((x) => x.id === btn.getAttribute('data-memo'));
        if (!m) return;
        share({
          title: m.title,
          text: `Памятка «${m.title}» — ${m.subtitle}`,
          url: CHUNKED_PDF
            ? `${location.origin}${location.pathname}#/memos`
            : new URL(memo.file, location.href).href,
        });
      });
    });
  }

  /* ---------- дерево решений ---------- */
  let treeState = { situation: null, index: 0, answers: {} };
  function treeSituation(id) {
    return NC.tree.situations.find((s) => s.id === id);
  }
  function treeLeaves(s) {
    return s.questions.reduce((acc, q) => acc * q.options.length, 1);
  }
  function viewTree() {
    const body = treeState.situation ? renderTreeFlow() : renderTreeIntro();
    return `<div class="screen">
      ${topbar('Алгоритм выбора', { back: '#/home', action: treeState.situation ? `<button class="iconbtn" id="tree-reset" aria-label="Сбросить">${ICON.close}</button>` : '' })}
      <div class="screen__body screen__body--no-nav" id="tree-body">${body}</div>
    </div>`;
  }
  function renderTreeIntro() {
    return `<div class="block">
        <h1>Подберите продукт</h1>
        <p class="muted small">${esc(NC.tree.introText)}</p>
      </div>
      <div class="list" style="margin-top:6px">
        ${NC.tree.situations.map((s) => `
          <button class="row" data-situation="${s.id}" style="padding:16px">
            <span class="row__icon">${SIT_ICON[s.id] || ICON.branch}</span>
            <span class="row__main">
              <span class="row__title">${esc(s.title)}</span>
              <span class="row__sub">${esc(s.text)}</span>
              <span class="row__sub">${treeLeaves(s)} варианта перехода</span>
            </span>
            <span class="row__chev">${ICON.chevron}</span>
          </button>`).join('')}
      </div>
      <div class="footer-note">Всего 92 варианта перехода · рекомендация носит справочный характер</div>`;
  }
  function renderTreeFlow() {
    const s = treeSituation(treeState.situation);
    const q = s.questions[treeState.index];
    const total = s.questions.length;
    const pct = Math.round((treeState.index / total) * 100);
    const crumbs = s.questions.slice(0, treeState.index).map((qq) => {
      const val = treeState.answers[qq.id];
      const opt = qq.options.find((o) => o.value === val);
      return `<span class="crumb">${esc(opt ? opt.label : val)}</span>`;
    }).join('');
    return `<div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
      <div class="tiny muted">Шаг ${treeState.index + 1} из ${total}</div>
      ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
      <div class="question">
        <div class="question__text">${esc(q.text)}</div>
        <div class="options">
          ${q.options.map((o) => `<button class="option" data-answer="${esc(o.value)}">
            <span class="option__marker">${ICON.chevron}</span>
            <span>${esc(o.label)}</span>
          </button>`).join('')}
        </div>
      </div>
      <div class="footer-note">Ответы не сохраняются на сервер</div>`;
  }
  function renderTreeResult() {
    const s = treeSituation(treeState.situation);
    const rule = NC_RULES[treeState.situation];
    const pid = rule(treeState.answers);
    const p = productById(pid) || NC.products[0];
    const c = catById(p.category);
    return `<div class="result">
        <div class="result__head">
          <span class="result__badge">Рекомендация</span>
          <h1 style="font-size:24px">Подходящий продукт</h1>
          <p class="muted small">По ответам в разделе «${esc(s.title)}»</p>
        </div>
        <div class="result__card" data-go="#/product/${p.id}">
          <img src="${cover(p)}" alt="${esc(p.name)}">
          <div>
            <div class="row__title" style="font-size:15px">${esc(p.name)}</div>
            <div class="tiny muted">${esc(c.title)} · ${esc(p.age)}</div>
            <div class="tiny" style="color:var(--teal); margin-top:5px; font-weight:650">Открыть карточку →</div>
          </div>
        </div>
        <div class="card card--pad">
          <p class="small" style="color:var(--ink-2)">${esc(p.short)}</p>
        </div>
        <div class="card card--pad">
          <div class="block__title" style="margin-bottom:6px">Ключевые особенности</div>
          ${p.highlights.map((h) => `<div class="feat" style="margin-bottom:6px"><span class="feat__ico">${ICON.check}</span>${esc(h)}</div>`).join('')}
        </div>
        <div class="actions">
          <button class="btn btn--primary" data-go="#/product/${p.id}">Открыть карточку</button>
        </div>
        <button class="btn btn--ghost" data-tree-restart>Начать подбор заново</button>
        <div class="footer-note">Рекомендация носит справочный характер и не заменяет решение врача.</div>
      </div>`;
  }
  function mountTree() {
    const reset = $('#tree-reset');
    if (reset) reset.addEventListener('click', () => { treeState = { situation: null, index: 0, answers: {} }; render(); });
    const restart = $('[data-tree-restart]');
    if (restart) restart.addEventListener('click', () => { treeState = { situation: null, index: 0, answers: {} }; render(); });
    $$('[data-situation]').forEach((btn) => {
      btn.addEventListener('click', () => {
        treeState = { situation: btn.getAttribute('data-situation'), index: 0, answers: {} };
        render();
      });
    });
    $$('[data-answer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = treeSituation(treeState.situation);
        const q = s.questions[treeState.index];
        treeState.answers[q.id] = btn.getAttribute('data-answer');
        if (treeState.index + 1 < s.questions.length) {
          treeState.index += 1;
        } else {
          treeState.index = s.questions.length;
        }
        render();
      });
    });
  }
  function treeBodyHtml() {
    if (!treeState.situation) return renderTreeIntro();
    const s = treeSituation(treeState.situation);
    return treeState.index >= s.questions.length ? renderTreeResult() : renderTreeFlow();
  }

  /* ---------- уведомления ---------- */
  function viewNotifications() {
    const items = NC.notifications.slice().sort((a, b) => b.date.localeCompare(a.date));
    const unread = unreadCount();
    return `<div class="screen">
      ${topbar('Уведомления', {
        back: '#/home',
        action: unread ? `<button class="btn btn--link" id="read-all" style="white-space:nowrap">Прочитать все</button>` : '',
      })}
      <div class="screen__body screen__body--flat">
        ${('Notification' in window) && Notification.permission !== 'granted' ? `
          <div class="card card--pad">
            <div class="row__title" style="font-size:14px">Push-уведомления</div>
            <p class="small muted" style="margin-top:4px">Около 2 раз в месяц: обновления ассортимента, новые памятки, важные изменения.</p>
            <div style="height:10px"></div>
            <button class="btn btn--soft btn--sm" id="enable-push">Разрешить уведомления</button>
          </div>` : ''}
        <div class="list">
          ${items.map((n) => {
            const isUnread = !state.readNotifs.includes(n.id);
            return `<div class="notif ${isUnread ? 'notif--unread' : ''}">
              ${isUnread ? '<span class="notif__dot"></span>' : ''}
              <span class="notif__icon ${n.type === 'important' ? 'notif__icon--important' : (n.type === 'update' ? 'notif__icon--update' : '')}">
                ${n.type === 'update' ? ICON.clock : (n.type === 'important' ? ICON.info : ICON.doc)}
              </span>
              <span class="row__main">
                <span class="notif__title">${esc(n.title)}</span>
                <span class="notif__text">${esc(n.body)}</span>
                <span class="notif__date">${esc(fmtDate(n.date))}</span>
              </span>
            </div>`;
          }).join('')}
        </div>
        <div class="footer-note">Демонстрационная лента уведомлений</div>
      </div>
    </div>`;
  }
  function mountNotifications() {
    const all = $('#read-all');
    if (all) all.addEventListener('click', () => {
      state.readNotifs = NC.notifications.map((n) => n.id);
      saveState();
      render();
    });
    const push = $('#enable-push');
    if (push) push.addEventListener('click', async () => {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          toast('Уведомления включены');
          new Notification('Приложение для врачей', { body: 'Спасибо! Теперь вы будете получать обновления.', icon: 'icons/icon-192.png' });
          render();
        } else {
          toast('Разрешение не выдано');
        }
      } catch (e) { toast('Уведомления недоступны в этом браузере'); }
    });
  }

  /* ---------- профиль ---------- */
  function viewProfile() {
    const u = state.user || {};
    const pushState = ('Notification' in window) ? Notification.permission : 'unsupported';
    const pushLabel = pushState === 'granted' ? 'Включены' : (pushState === 'denied' ? 'Запрещены' : 'Не включены');
    return `<div class="screen">
      ${topbar('Профиль', { back: '#/home' })}
      <div class="screen__body screen__body--flat">
        <div class="profile">
          <div class="profile__avatar">${esc(initials(u.name))}</div>
          <div class="profile__name">${esc(u.name || 'Специалист')}</div>
          <div class="profile__meta">${esc(u.email || '—')}</div>
          <div class="verified ${u.verified ? '' : 'verified--warn'}">${u.verified ? ICON.check + ' Email подтверждён' : 'Email не подтверждён'}</div>
        </div>
        <div class="list" style="margin-top:8px">
          <button class="row" data-go="#/notifications">
            <span class="row__icon">${ICON.bell}</span>
            <span class="row__main">
              <span class="row__title">Уведомления</span>
              <span class="row__sub">Push: ${pushLabel}</span>
            </span>
            <span class="row__chev">${ICON.chevron}</span>
          </button>
          <button class="row" id="install-app">
            <span class="row__icon">${ICON.install}</span>
            <span class="row__main">
              <span class="row__title">Установить приложение</span>
              <span class="row__sub">Добавить иконку на главный экран</span>
            </span>
            <span class="row__chev">${ICON.chevron}</span>
          </button>
          <button class="row" data-notice>
            <span class="row__icon">${ICON.shield}</span>
            <span class="row__main">
              <span class="row__title">Важное замечание</span>
              <span class="row__sub">Условия использования материалов</span>
            </span>
            <span class="row__chev">${ICON.chevron}</span>
          </button>
          <a class="row" href="privacy.html" target="_blank" rel="noopener">
            <span class="row__icon">${ICON.doc}</span>
            <span class="row__main">
              <span class="row__title">Политика конфиденциальности</span>
              <span class="row__sub">Обработка персональных данных</span>
            </span>
            <span class="row__chev">${ICON.chevron}</span>
          </a>
          <div class="card card--pad" style="margin-top:2px">
            <div class="kv"><span>Версия</span><span>${esc(NC.brand.version)} (демо)</span></div>
            <div class="kv"><span>Доступ</span><span>${u.code ? esc(u.code) : (u.login ? esc(u.login) : '—')}</span></div>
            <div class="kv"><span>Статус</span><span>${u.verified ? 'Подтверждён' : 'Ожидает подтверждения'}</span></div>
          </div>
          <button class="btn btn--danger" id="logout">${ICON.logout}<span>Выйти</span></button>
        </div>
        <div class="footer-note">© 2026 Приложение для врачей · Демонстрационная версия</div>
      </div>
      ${bottomNav('profile')}
    </div>`;
  }
  function mountProfile() {
    const logout = $('#logout');
    if (logout) logout.addEventListener('click', () => {
      state.user = null;
      saveState();
      go('#/welcome');
    });
    const install = $('#install-app');
    if (install) install.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(() => null);
        if (choice && choice.outcome === 'accepted') toast('Приложение установлено');
        deferredPrompt = null;
      } else {
        toast('В меню браузера выберите «Добавить на главный экран»');
      }
    });
  }

  /* ---------- уведомление о важном ---------- */
  function mountNoticeButtons() {
    $$('[data-notice]').forEach((el) => el.addEventListener('click', () => openModal(NC.notice.title, NC.notice.text)));
  }

  /* ============================================================
     РОУТЕР
     ============================================================ */
  const routes = [
    { name: 'welcome', view: viewWelcome, mount: mountWelcome, public: true },
    { name: 'code', view: viewCode, mount: mountCode, public: true },
    { name: 'login', view: viewLogin, mount: mountLogin, public: true },
    { name: 'register', view: viewRegister, mount: mountRegister, public: true },
    { name: 'verify', view: viewVerify, mount: mountVerify, public: true },
    { name: 'recovery', view: viewRecovery, mount: mountRecovery, public: true },
    { name: 'home', view: viewHome, mount: mountNoticeButtons },
    { name: 'catalog', view: viewCatalog, mount: mountCatalog },
    { name: 'product', view: viewProduct, mount: mountProduct },
    { name: 'memos', view: viewMemos, mount: mountMemos },
    { name: 'tree', view: viewTree, mount: mountTree },
    { name: 'notifications', view: viewNotifications, mount: mountNotifications },
    { name: 'profile', view: viewProfile, mount: mountProfile },
  ];

  function mountWelcome() {
    state.welcomeSeen = true;
    saveState();
  }

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    if (!raw) return { name: 'welcome', param: null };
    const [name, param] = raw.split('/');
    return { name: name || 'welcome', param: param || null };
  }

  function render() {
    const { name, param } = parseHash();
    const route = routes.find((r) => r.name === name) || routes[0];
    if (!route.public && !state.user) {
      location.replace('#/welcome');
      return;
    }
    if (route.public && state.user && (name === 'welcome')) {
      location.replace('#/home');
      return;
    }
    app().innerHTML = route.view(param);
    if (name === 'tree') {
      const body = $('#tree-body');
      if (body) body.innerHTML = treeBodyHtml();
    }
    if (route.mount) route.mount(param);
    mountNoticeButtons();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);

  /* ---------- старт ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // демо-режим: ?demo=1 сразу открывает приложение под тестовым специалистом
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('demo') === '1' && !state.user) {
        state.user = {
          name: NC.demo.login.name,
          email: NC.demo.login.email,
          login: NC.demo.login.login,
          verified: true,
          code: NC.demo.codes[0],
        };
        saveState();
        if (!location.hash || location.hash === '#/welcome') {
          history.replaceState(null, '', '#/home');
        }
      }
    } catch (e) {}

    render();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
  });
})();
