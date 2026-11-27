/* Stowhive - assets, renewals and quick records.
 * Plain JavaScript, no dependencies. Data is kept in localStorage through the
 * Store object below, so it can be swapped for Supabase later without touching the UI code.
 */
(() => {
  'use strict';
  const tr = (s, v) => window.L.t(s, v);
  const IC = n => window.SHI.ic(n);
  const LOCALE = () => (window.L.lang === 'zh' ? 'zh-CN' : 'en-GB');

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */
  const APP_NAME = 'Stowhive'; // change the product name here only
  const CURRENCY = 'RM';
  // Cloud sync (Supabase). Leave empty to keep everything on this device only.
  const SUPABASE_URL = 'https://vqzmpjhztxximradeugg.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_wBEBDUSOJFolzI32BqMuMA_IkHAFqLl';
  const STORAGE_KEY = 'myvault.v1';
  const DAY_MS = 86400000;
  const CATEGORIES = ['Electronics', 'Appliances', 'Vehicle', 'Office Equipment'];

  // One-tap presets on the Renewals tab: only a date is needed.
  const QUICK_ADD = [
    { t: 'Passport', type: 'document', cycle: 'onetime', remind: 30, i: IC('id') },
    { t: 'Driving licence', type: 'document', cycle: 'onetime', remind: 30, i: IC('card') },
    { t: 'Road tax', type: 'document', cycle: 'yearly', remind: 14, i: IC('road') },
    { t: 'Car insurance', type: 'document', cycle: 'yearly', remind: 30, i: IC('shield') },
    { t: 'Netflix', type: 'subscription', cycle: 'monthly', remind: 3, i: IC('film') },
    { t: 'Spotify', type: 'subscription', cycle: 'monthly', remind: 3, i: IC('music') },
    { t: 'YouTube Premium', type: 'subscription', cycle: 'monthly', remind: 3, i: IC('play') },
    { t: 'iCloud', type: 'subscription', cycle: 'monthly', remind: 3, i: IC('cloud') },
    { t: 'SPayLater', type: 'paylater', cycle: 'monthly', remind: 3, i: IC('card') },
    { t: 'Grab PayLater', type: 'paylater', cycle: 'monthly', remind: 3, i: IC('card') },
    { t: 'Atome', type: 'paylater', cycle: 'monthly', remind: 3, i: IC('card') },
    { t: 'Boost PayLater', type: 'paylater', cycle: 'monthly', remind: 3, i: IC('card') }
  ];

  const CYCLE_LABEL = { get monthly() { return tr('Monthly'); }, get yearly() { return tr('Yearly'); }, get onetime() { return tr('One-time'); } };

  // Asset categories: built-in ones, the user's own, and any category still used by an item.
  const NEW_CAT = '__new__';
  const catNames = () => {
    const hidden = db.custom.hiddenCats;
    const list = [...CATEGORIES.filter(c => !hidden.includes(c)), ...db.custom.assetCats, ...(hidden.includes('Other') ? [] : ['Other'])];
    db.assets.forEach(a => { if (a.category && !list.includes(a.category)) list.push(a.category); });
    return list;
  };

  /* ------------------------------------------------------------------ */
  /* Storage layer (replace with Supabase later)                         */
  /* ------------------------------------------------------------------ */
  const Store = {
    normalize(d) {
      d = d || {};
      return {
        assets: d.assets || [],
        renewals: d.renewals || [],
        expenses: Array.isArray(d.expenses) ? d.expenses : [],
        schedule: Array.isArray(d.schedule) ? d.schedule : [],
        habits: Array.isArray(d.habits) ? d.habits : [],
        todos: Array.isArray(d.todos) ? d.todos : [],
        journal: Array.isArray(d.journal) ? d.journal : [],
        notes: Array.isArray(d.notes) ? d.notes : [],
        work: Array.isArray(d.work) ? d.work : [],
        budget: (() => { const b = (d.budget && typeof d.budget === 'object') ? d.budget : {}; const caps = {}; Object.entries(b.caps || {}).forEach(([k, v]) => { if (Number(v) > 0) caps[k] = Number(v); }); return { amount: Math.max(0, Number(b.amount) || 0), updatedAt: b.updatedAt || '', caps, customCats: (Array.isArray(b.customCats) ? b.customCats : []).filter(c => c && /^c_[a-z0-9]+$/.test(c.k) && typeof c.name === 'string' && c.name.trim()).slice(0, 12).map(c => ({ k: c.k, name: c.name.trim().slice(0, 14), ic: typeof c.ic === 'string' ? c.ic.slice(0, 16) : 'tag', ci: Number.isInteger(c.ci) ? c.ci : 7 })), hiddenCats: (Array.isArray(b.hiddenCats) ? b.hiddenCats : []).filter(k => typeof k === 'string' && k !== 'other').slice(0, 20), recurring: (Array.isArray(b.recurring) ? b.recurring : []).filter(r => r && r.id && Number(r.amount) > 0) }; })(),
        custom: {
          assetCats: (d.custom && d.custom.assetCats) || [],
          hiddenCats: (d.custom && d.custom.hiddenCats) || []
        },
        deleted: d.deleted || {},
        updatedAt: d.updatedAt || ''
      };
    },
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return this.normalize(JSON.parse(raw));
      } catch (e) { /* fall through to empty data */ }
      return this.normalize({});
    },
    save(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  // This app no longer keeps photos, signatures, phone numbers or terms text.
  // Remove them from data saved by an older version. Returns true if anything was removed.
  function scrubOldData(d) {
    let changed = false;
    const drop = (rec, keys) => keys.forEach(k => { if (k in rec) { delete rec[k]; changed = true; } });
    d.assets.forEach(a => drop(a, ['receiptImg', 'locationImg']));
    return changed;
  }

  let db = Store.load();

  // Optional pages. Off pages are hidden everywhere; the data is kept. Until the user decides, a page is on only if it already has data.
  const FEAT_KEY = 'stowhive.features';
  const FEATURES = [['assets', 'box', 'My Items', 'Where it is, warranty'], ['budget', 'wallet', 'Daily Budget', 'Set a monthly budget'], ['work', 'briefcase', 'Daily Work', 'Daily checks, links, logins']];
  const featStore = () => { try { return JSON.parse(localStorage.getItem(FEAT_KEY)) || {}; } catch (e) { return {}; } };
  const featHas = {
    assets: () => (db.assets || []).length > 0,
    budget: () => !!(db.budget && db.budget.amount > 0) || (db.expenses || []).length > 0,
    work: () => (db.work || []).length > 0
  };
  const featOn = k => { const v = featStore()[k]; return typeof v === 'boolean' ? v : featHas[k](); };
  function setFeat(k, on) { const st = featStore(); st[k] = !!on; try { localStorage.setItem(FEAT_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }
  const moreHasItems = () => FEATURES.some(f => f[0] !== 'work' && featOn(f[0]));
  function applyFeatures() {
    ['assets', 'budget'].forEach(k => $$('.nav-btn[data-tab="' + k + '"]').forEach(b => { b.style.display = ''; }));
    const wp = $('#today-tabs [data-tab="work"]'), tt = $('#today-tabs');
    if (wp) wp.style.display = featOn('work') ? '' : 'none';
    if (tt) { tt.style.setProperty('--n', 2); tt.classList.toggle('one', !featOn('work')); }
  }
  if (scrubOldData(db)) {
    try { Store.save(db); } catch (e) { /* ignore */ }
  }

  const ui = {
    tab: 'home',
    calMonth: '',
    calSel: null,
    assetFilter: 'all',
    assetCat: 'All',
    assetQuery: '',
    renewTab: 'subscription',
    showArchived: false,
    expanded: new Set()
  };

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const pad = n => String(n).padStart(2, '0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => toISO(new Date());
  const daysUntil = iso => Math.round((parseISO(iso) - parseISO(todayISO())) / DAY_MS);

  function addMonths(iso, n) {
    const d = parseISO(iso);
    const day = d.getDate();
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
    return toISO(r);
  }

  const fmtDate = iso => iso
    ? parseISO(iso).toLocaleDateString(LOCALE(), { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  const fmtDateTime = isoStr => new Date(isoStr).toLocaleString(LOCALE(), {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const money = n => `${CURRENCY} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // red: 3 days or less (or overdue), yellow: 4-30 days, green: more than 30 days
  const urgency = days => (days <= 3 ? 'red' : days <= 30 ? 'yellow' : 'green');
  const daysText = days => (days < 0 ? tr('{n}d overdue', { n: -days }) : days === 0 ? tr('Due today') : tr('{n}d left', { n: days }));

  // Toast with an optional action button, e.g. toast('Deleted', { actionLabel: 'Undo', onAction: fn })
  let toastTimer = null;
  function toast(msg, opts) {
    const o = opts || {};
    const el = $('#toast');
    el.textContent = '';
    const span = document.createElement('span');
    span.textContent = tr(msg);
    el.appendChild(span);
    el.classList.toggle('has-action', !!o.actionLabel);
    if (o.actionLabel) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-btn';
      b.textContent = o.actionLabel;
      b.addEventListener('click', () => {
        clearTimeout(toastTimer);
        el.classList.remove('show');
        if (o.onAction) o.onAction();
      });
      el.appendChild(b);
    }
    el.classList.add('show');
    const bad = ['Enter an amount above 0', 'This looks like an ID or card number. Please remove it to continue', 'Pick a mood or write a line', 'Pick a due date first', 'Storage is full. Delete some records and try again.'];
    buzz(bad.some(k => msg === k || msg === tr(k)) ? 'error' : o.actionLabel ? 'warn' : 'success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), o.ms || 2600);
  }

  // Haptics: Android vibrates, iPhone (iOS 18+) taps through a hidden switch. Other devices ignore it.
  const HAP = { tap: 6, select: 10, success: [10, 45, 18], warn: [22, 60, 22], error: [30, 50, 30, 50, 30], heavy: 20 };
  let hapLabel = null;
  function iosTap() {
    try {
      if (!hapLabel) {
        hapLabel = document.createElement('label');
        hapLabel.setAttribute('aria-hidden', 'true');
        hapLabel.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none';
        const i = document.createElement('input');
        i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
        hapLabel.appendChild(i); document.body.appendChild(hapLabel);
      }
      hapLabel.click();
    } catch (e) { /* ignore */ }
  }
  function buzz(kind) {
    try {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const p = typeof kind === 'number' ? kind : (HAP[kind] || 8);
      if (navigator.vibrate) { navigator.vibrate(p); return; }
      iosTap();
      if (Array.isArray(p)) setTimeout(iosTap, 90);
    } catch (e) { /* ignore */ }
  }

  // Styled confirm dialog. Resolves to true (confirmed) or false (cancelled).
  function confirmDialog(opts) {
    return new Promise(resolve => {
      const old = $('#confirm-root');
      if (old) old.remove();
      $('#toast').classList.remove('show'); // hide any earlier toast behind the dialog
      const danger = opts.danger !== false;
      const root = document.createElement('div');
      root.id = 'confirm-root';
      root.className = 'confirm-backdrop';
      root.innerHTML = `
        <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="cf-title">
          <div class="confirm-ico ${danger ? 'danger' : ''}">${danger ? IC('trash') : IC('help')}</div>
          <h3 id="cf-title">${esc(tr(opts.title))}</h3>
          <p>${esc(tr(opts.message || ''))}</p>
          <div class="confirm-btns">
            <button type="button" class="btn ghost" data-cf="no">${esc(tr(opts.cancelLabel || 'Cancel'))}</button>
            <button type="button" class="btn ${danger ? 'danger-solid' : 'primary'}" data-cf="yes">${esc(tr(opts.confirmLabel || 'Confirm'))}</button>
          </div>
        </div>`;
      document.body.appendChild(root);

      const hadLock = document.body.classList.contains('modal-open');
      document.body.classList.add('modal-open');

      const finish = result => {
        document.removeEventListener('keydown', onKey, true);
        root.classList.add('closing');
        setTimeout(() => root.remove(), 130);
        if (!hadLock) document.body.classList.remove('modal-open');
        resolve(result);
      };
      // Capture phase, so Escape closes only this dialog and not the form behind it.
      const onKey = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
      };
      document.addEventListener('keydown', onKey, true);
      root.addEventListener('click', e => {
        if (e.target === root) { finish(false); return; }
        const b = e.target.closest('[data-cf]');
        if (b) finish(b.dataset.cf === 'yes');
      });
      $('[data-cf="no"]', root).focus();
    });
  }

  // Give every added/changed record an updatedAt and remember deleted ids, so two devices can be merged safely.
  function stampChanges(prev) {
    const now = new Date().toISOString();
    db.deleted = db.deleted || {};
    ['assets', 'renewals', 'expenses', 'schedule', 'habits', 'todos', 'journal', 'notes', 'work'].forEach(k => {
      const old = new Map((prev[k] || []).map(r => [r.id, r]));
      const strip = r => JSON.stringify({ ...r, updatedAt: undefined });
      db[k].forEach(r => {
        const o = old.get(r.id);
        if (!o || strip(o) !== strip(r)) { r.updatedAt = now; delete db.deleted[r.id]; }
        old.delete(r.id);
      });
      old.forEach((r, id) => { db.deleted[id] = now; });
    });
  }

  // Merge two copies of the data: per record, the newer one wins; records only one side has are kept; deletions win over older copies.
  function mergeDb(a, b) {
    const out = Store.normalize({});
    const del = { ...(b.deleted || {}) };
    Object.entries(a.deleted || {}).forEach(([id, t]) => { if (!(del[id] > t)) del[id] = t; });
    ['assets', 'renewals', 'expenses', 'schedule', 'habits', 'todos', 'journal', 'notes', 'work'].forEach(k => {
      const map = new Map();
      const take = r => { const c = map.get(r.id); if (!c || (r.updatedAt || '') > (c.updatedAt || '')) map.set(r.id, r); };
      (a[k] || []).forEach(take);
      (b[k] || []).forEach(take);
      out[k] = [...map.values()].filter(r => {
        const t = del[r.id];
        if (t && t >= (r.updatedAt || '')) return false;
        if (t) delete del[r.id];
        return true;
      });
    });
    const uni = (x, y) => [...new Set([...(x || []), ...(y || [])])];
    out.custom = { assetCats: uni(a.custom.assetCats, b.custom.assetCats), hiddenCats: uni(a.custom.hiddenCats, b.custom.hiddenCats) };
    out.deleted = del;
    out.budget = ((a.budget && a.budget.updatedAt) || '') >= ((b.budget && b.budget.updatedAt) || '') ? a.budget : b.budget;
    out.updatedAt = (a.updatedAt || '') > (b.updatedAt || '') ? a.updatedAt : b.updatedAt;
    return out;
  }

  // Apply a change to db and persist it. Roll back if storage is full.
  function commit(mutator) {
    const snapshot = JSON.stringify(db);
    mutator();
    try {
      db.updatedAt = new Date().toISOString();
      stampChanges(JSON.parse(snapshot));
      Store.save(db);
      Cloud.schedule();
    } catch (e) {
      db = JSON.parse(snapshot);
      toast('Storage is full. Delete some records and try again.');
      return false;
    }
    try { renderHeader(); } catch (e) { /* ignore */ }
    return true;
  }

  // Delete one record and offer a 6 second Undo that puts back only that record.
  function removeRecord(collection, id, label) {
    const idx = db[collection].findIndex(x => x.id === id);
    if (idx < 0) return false;
    const rec = db[collection][idx];
    if (!commit(() => { db[collection] = db[collection].filter(x => x.id !== id); })) return false;
    toast(tr('{label} deleted', { label: tr(label) }), {
      actionLabel: tr('Undo'),
      ms: 6000,
      onAction: () => {
        const ok = commit(() => {
          db[collection].splice(Math.min(idx, db[collection].length), 0, rec);
        });
        if (ok) { renderAll(); toast(tr('{label} restored', { label: tr(label) })); }
      }
    });
    return true;
  }

  // Put a renewal back to how it was before "Renewed" / "Archive".
  function undoRenewal(id, before) {
    const cur = db.renewals.find(x => x.id === id);
    if (cur && commit(() => { Object.assign(cur, before); })) {
      renderAll();
      toast('Undone');
    }
  }

  function upsert(arr, rec) {
    const i = arr.findIndex(x => x.id === rec.id);
    if (i >= 0) {
      arr[i] = { ...arr[i], ...rec };
      delete arr[i].sample; // once the user edits a sample item it becomes their own
    } else arr.push(rec);
  }

  /* ------------------------------------------------------------------ */
  /* Sensitive data guard: no photos, no ID or card numbers              */
  /* ------------------------------------------------------------------ */
  const SENSITIVE_NOTE = 'Do not enter ID numbers, passwords, bank or card numbers.';
  const safeNote = text => `<p class="safe-note">${IC('lock')} ${esc(tr(text || SENSITIVE_NOTE))}</p>`;

  // Looks like an ID number (e.g. 900101-14-5678) or a long digit string such as a card number.
  const looksSensitive = v => {
    const t = String(v == null ? '' : v);
    return /\b\d{6}-?\d{2}-?\d{4}\b/.test(t) || /\b(?:\d[ -]?){13,19}\b/.test(t);
  };

  // Error text for a wizard step if any of the named fields looks like an ID or card number.
  const sensitiveErr = (x, names) =>
    names.some(n => looksSensitive(x[n])) ? 'This looks like an ID or card number. Please remove it to continue' : '';

  /* ------------------------------------------------------------------ */
  /* Form field builders                                                 */
  /* ------------------------------------------------------------------ */
  const val = v => esc(v == null ? '' : v);

  const fInput = (label, name, type = 'text', value = '', extra = '') =>
    `<label class="field"><span>${tr(label)}</span><input name="${name}" type="${type}" value="${val(value)}" ${extra}></label>`;

  const fText = (label, name, value = '', rows = 3, extra = '') =>
    `<label class="field"><span>${tr(label)}</span><textarea name="${name}" rows="${rows}" ${extra}>${val(value)}</textarea></label>`;

  const fSelect = (label, name, options, selected) =>
    `<label class="field"><span>${tr(label)}</span><select name="${name}">${options.map(o =>
      `<option value="${esc(o.v)}" ${String(o.v) === String(selected) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></label>`;

  /* ------------------------------------------------------------------ */
  /* Modal                                                               */
  /* ------------------------------------------------------------------ */
  function openModal(title, html, onMount) {
    const root = $('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-action="backdrop">
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-head">
            <h2>${esc(tr(title))}</h2>
            <button class="icon-btn" data-action="close-modal" aria-label="${esc(tr('Close'))}">&times;</button>
          </div>
          <div class="sheet-body">${html}</div>
        </div>
      </div>`;
    document.body.classList.add('modal-open');
    if (onMount) onMount(root);
  }

  function closeModal() {
    ui.dayModal = null;
    $('#modal-root').innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  /* ------------------------------------------------------------------ */
  /* Header dashboard                                                    */
  /* ------------------------------------------------------------------ */
  const renewKind = r => (r.type === 'subscription' ? 'Billing' : r.type === 'paylater' ? 'PayLater' : 'Renewal');

  function collectAlerts() {
    const list = [];
    db.assets.forEach(a => {
      // An already-expired warranty is not an action item, so only upcoming expiries count.
      if (a.warrantyExpiry) {
        const d = daysUntil(a.warrantyExpiry);
        if (d >= 0) list.push({ kind: 'Warranty', name: a.name, days: d, tab: 'assets', id: a.id });
      }
      if (a.nextMaintenanceDate) {
        list.push({ kind: 'Service', name: a.name, days: daysUntil(a.nextMaintenanceDate), tab: 'assets', id: a.id });
      }
    });
    db.renewals.forEach(r => {
      if (r.status === 'active' && r.nextDueDate) {
        list.push({ kind: renewKind(r), name: r.title, days: daysUntil(r.nextDueDate), tab: 'renewals', id: r.id, sub: r.type });
      }
    });
    return list.sort((a, b) => a.days - b.days);
  }

  const monthlyEquivalent = r => {
    const amt = Number(r.amount) || 0;
    if (r.cycle === 'monthly') return amt;
    if (r.cycle === 'yearly') return amt / 12;
    return 0;
  };

  // Free trials are not billed yet, so they are left out of the monthly total.
  const activeSubscriptions = () => db.renewals.filter(r => r.type === 'subscription' && r.status === 'active' && !r.isTrial);

  // The banner always has the same shape: two cards, each with a label, a big value and one small line. What they say depends on the page.
  function renderHeader() {
    $('#today-label').textContent = new Date().toLocaleDateString(LOCALE(), { weekday: 'short', day: 'numeric', month: 'short' });
    const tab = ui.tab || 'home', t = todayISO();
    const card = (label, big, sub, small) => `<div class="sum-card"><div class="sum-label">${esc(label)}</div><div class="sum-big${small ? ' small' : ''}">${esc(big)}</div><div class="sum-sub">${esc(sub)}</div></div>`;
    const alerts = collectAlerts();
    const red = alerts.filter(a => a.days <= 3).length;
    const yellow = alerts.filter(a => a.days > 3 && a.days <= 30).length;
    const green = alerts.filter(a => a.days > 30).length;
    const dueCard = () => card(tr('Due within 30 days'), String(red + yellow),
      red + yellow ? [tr('{n} urgent', { n: red }), tr('{n} soon', { n: yellow }), tr('{n} safe', { n: green })].join(' \u00b7 ') : tr('Nothing due in the next 30 days'));
    let a, b, next = [];

    if (tab === 'home') {
      const left = todayRows().length;
      a = `<div class="sum-card tap" data-action="day-open" data-date="${t}" role="button" tabindex="0"><div class="sum-label">${esc(tr('What needs doing today'))}</div><div class="sum-big">${left}</div><div class="sum-sub">${esc(left ? tr('{n} to go', { n: left }) : tr('All done today'))}</div></div>`;
      b = dueCard();
    } else if (tab === 'daily') {
      // Same data as the Routine page: habits and mood
      const hs = activeHabits();
      const top = hs.map(h => ({ h, n: habitStreak(h) })).sort((x, y) => y.n - x.n)[0];
      const todayList = hs.filter(h => habitSched(h, t));
      const doneN = todayList.filter(h => habitDone(h, t)).length;
      a = card(tr('Habit streak'),
        top && top.n > 0 ? tr('{n} day streak', { n: top.n }) : '-',
        !hs.length ? tr('No habits yet. Add one below.')
          : (top.n > 0 ? top.h.name + ' \u00b7 ' : '') + tr('{a}/{b} habits', { a: doneN, b: todayList.length }));
      const jm = journalOn(t), mv = jm ? Number(jm.mood) : 0;
      b = `<div class="sum-card"><div class="sum-label">${esc(tr('Mood & diary'))}</div><div class="sum-big small">${mv ? window.SHI.face(mv) + ' ' + esc(tr(moodOf(mv).en)) : '-'}</div><div class="sum-sub">${esc(jm && jm.text ? jm.text : tr('Nothing written yet.'))}</div></div>`;
    } else if (tab === 'work') {
      const n = db.work.length, d = db.work.filter(checkedToday).length;
      const total = db.work.reduce((s, w) => s + checksOn(w, t).length, 0);
      a = card(tr('Checked today'), n ? d + '/' + n : '-', !n ? tr('No links yet') : (d >= n ? tr('All checked today') : tr('{n} left to check', { n: n - d })));
      b = card(tr('Checks today'), String(total), tr('Links opened today'));
    } else if (tab === 'notes') {
      const pinned = db.notes.filter(x => x.pinned).length;
      const last = db.notes.slice().sort((x, y) => (y.updatedAt || y.createdAt || '').localeCompare(x.updatedAt || x.createdAt || ''))[0];
      const ld = last ? (last.updatedAt || last.createdAt || '').slice(0, 10) : '';
      a = card(tr('Notes'), String(db.notes.length), tr('{n} pinned', { n: pinned }));
      b = card(tr('Last edited'), /^\d{4}-\d{2}-\d{2}$/.test(ld) ? parseISO(ld).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' }) : '-',
        last ? String(last.title || String(last.body || '').split('\n')[0] || '').slice(0, 28) : tr('No notes yet'), true);
    } else if (tab === 'assets') {
      const worth = db.assets.reduce((s, x) => s + (Number(x.price) || 0), 0);
      const w = db.assets.filter(x => assetFlag(x, 'warranty')).length, sv = db.assets.filter(x => assetFlag(x, 'service')).length;
      const att = db.assets.filter(x => assetFlag(x, 'warranty') || assetFlag(x, 'service') || assetFlag(x, 'expired')).length;
      a = card(tr('My Items'), String(db.assets.length), worth > 0 ? tr('Worth {v}', { v: money(worth) }) : tr('Where it is, warranty'));
      b = card(tr('Needs attention'), String(att), tr('{a} warranty ending \u00b7 {b} service due', { a: w, b: sv }));
    } else if (tab === 'budget') {
      const s = expenseStats(), has = s.budget > 0, over = has && s.left < 0;
      a = card(tr('Spent this month'), money(s.spent), has ? tr('of {v}', { v: money(s.budget) }) + ' \u00b7 ' + tr('{p}% used', { p: Math.round(s.spent / s.budget * 100) }) : tr('No budget set'), true);
      b = card(over ? tr('Over budget by') : tr('Left this month'), has ? money(Math.abs(s.left)) : '-',
        has ? (over ? tr('Today') + ' ' + money(s.todaySum) : tr('Can spend per day') + ' ' + money(s.perDay)) : tr('Set a monthly budget'), true);
    } else if (tab === 'renewals') {
      const rt = ui.renewTab || 'subscription';
      const act = db.renewals.filter(r => r.type === rt && r.status === 'active');
      const dated = act.filter(r => r.nextDueDate).sort((x, y) => x.nextDueDate.localeCompare(y.nextDueDate));
      const soon = dated.filter(r => daysUntil(r.nextDueDate) <= 30);
      const overdue = dated.filter(r => daysUntil(r.nextDueDate) < 0).length;
      const nx = dated[0];
      const dueSub = !act.length ? tr('Nothing added yet')
        : overdue ? tr('{n} overdue', { n: overdue }) + (soon.length > overdue ? ' \u00b7 ' + tr('{n} due within 30 days', { n: soon.length - overdue }) : '')
        : soon.length ? tr('{n} due within 30 days', { n: soon.length }) + ' \u00b7 ' + tr('Next: {name}, {d}', { name: nx.title, d: daysText(daysUntil(nx.nextDueDate)) })
        : nx ? tr('Next: {name}, {d}', { name: nx.title, d: daysText(daysUntil(nx.nextDueDate)) }) : tr('Nothing due in the next 30 days');
      if (rt === 'subscription') {
        const monthly = activeSubscriptions().reduce((t, r) => t + monthlyEquivalent(r), 0);
        a = card(tr('Subscriptions'), String(act.length), dueSub);
        b = card(tr('Monthly total'), money(monthly), tr('About {amount} a year', { amount: money(monthly * 12) }), true);
      } else if (rt === 'paylater') {
        const perMonth = act.reduce((t, r) => t + (Number(r.amount) || 0), 0);
        const toPay = act.reduce((t, r) => t + (Number(r.amount) || 0) * (Number(r.left) || 0), 0);
        a = card(tr('PayLater'), String(act.length), dueSub);
        b = card(tr('Monthly instalments'), money(perMonth), tr('Still to pay') + ' ' + money(toPay), true);
      } else {
        a = card(tr('IDs & Renewals'), String(act.length), dueSub);
        b = card(tr('Due within 30 days'), String(soon.length), overdue ? tr('{n} overdue', { n: overdue }) : nx ? tr('Next: {name}, {d}', { name: nx.title, d: daysText(daysUntil(nx.nextDueDate)) }) : tr('Nothing due in the next 30 days'));
      }
    } else {
      a = dueCard();
      next = alerts.filter(x => x.days <= 30).slice(0, 3);
    }

    if (!a && !b) a = dueCard(); // keep the header the same height on every page
    $('#summary').innerHTML = `
      ${a || b ? `<div class="sum-grid${a && b ? '' : ' one'}">${a || ''}${b || ''}</div>` : ''}
      ${next.length ? `<div class="next-up">${next.map(a => `
        <div class="next-row" data-action="jump" data-tab="${a.tab}" data-id="${esc(a.id)}" data-sub="${a.sub || ''}">
          <span class="nm"><span class="kd">${esc(tr(a.kind))}</span>${esc(a.name)}</span>
          <span class="badge ${urgency(a.days)}">${esc(daysText(a.days))}</span>
        </div>`).join('')}</div>` : ''}`;
  }

  /* ------------------------------------------------------------------ */
  /* Home: add chooser, 12-month timeline, calendar, spend               */
  /* ------------------------------------------------------------------ */
  // Every date a renewal falls on between two ISO dates (recurring ones repeat).
  function occurrences(r, fromISO, toISO_) {
    const out = [];
    if (!r.nextDueDate) return out;
    const step = r.cycle === 'yearly' ? 12 : r.cycle === 'monthly' ? 1 : 0;
    if (!step) {
      if (r.nextDueDate >= fromISO && r.nextDueDate <= toISO_) out.push(r.nextDueDate);
      return out;
    }
    const cap = r.type === 'paylater' ? Math.max(0, Number(r.left) || 0) : 400;
    for (let i = 0; i < Math.min(400, cap); i++) {
      const d = addMonths(r.nextDueDate, i * step);
      if (d > toISO_) break;
      if (d >= fromISO) out.push(d);
    }
    return out;
  }

  function getEvents(fromISO, toISO_) {
    const out = [];
    const push = (date, kind, name, amount, tab, id, sub) => {
      if (date && date >= fromISO && date <= toISO_) out.push({ date, kind, name, amount: amount || 0, tab, id, sub });
    };
    db.assets.forEach(a => {
      push(a.warrantyExpiry, 'Warranty', a.name, 0, 'assets', a.id);
      push(a.nextMaintenanceDate, 'Service', a.name, 0, 'assets', a.id);
    });
    db.renewals.forEach(r => {
      if (r.status !== 'active') return;
      const kind = renewKind(r);
      occurrences(r, fromISO, toISO_).forEach(d => push(d, kind, r.title, r.isTrial ? 0 : Number(r.amount) || 0, 'renewals', r.id, r.type));
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  const evRow = e => {
    const d = daysUntil(e.date);
    return `<div class="ev-row" data-action="jump" data-tab="${e.tab || ''}" data-id="${esc(e.id || '')}" data-sub="${e.sub || ''}">
      <span class="nm"><span class="kd">${esc(tr(e.kind))}</span>${esc(e.name)}</span>
      <span class="ev-r">${e.amount ? `<small>${esc(money(e.amount))}</small>` : ''}<span class="badge ${urgency(d)}">${esc(daysText(d))}</span></span>
    </div>`;
  };

  function timelineHtml() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const today = todayISO();
    const evs = getEvents('0000-01-01', toISO(new Date(y, m + 12, 0)))
      .filter(e => !(e.kind === 'Warranty' && e.date < today));
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(y, m + i, 1);
      return { iso: toISO(d), label: d.toLocaleDateString(LOCALE(), { month: 'short' }), long: d.toLocaleDateString(LOCALE(), { month: 'long' }), n: 0, spend: 0 };
    });
    evs.forEach(e => {
      const d = parseISO(e.date);
      let i = (d.getFullYear() - y) * 12 + d.getMonth() - m;
      if (i < 0) i = 0; // overdue items count towards this month
      if (i > 11) return;
      months[i].n++;
      if (e.kind === 'Billing' || e.kind === 'Renewal' || e.kind === 'PayLater') months[i].spend += e.amount;
    });
    const idle = !evs.length;
    const GHOST = [34, 52, 28, 66, 44, 80, 38, 58, 30, 72, 46, 60]; // placeholder skeleton heights (%)
    const max = Math.max(1, ...months.map(x => x.n));
    const busiest = months.reduce((b, x) => (x.n > b.n ? x : b), months[0]);
    const cols = months.map((x, i) => {
      const h = idle ? GHOST[i] : (x.n ? 12 + Math.round(x.n / max * 88) : 4);
      return `
        <button type="button" class="tl-col ${i === 0 ? 'cur' : ''}" data-action="cal-goto" data-month="${x.iso}" title="${esc(x.long)}: ${esc(tr('{n} due', { n: x.n }))}">
          <span class="tl-n">${x.n || ''}</span>
          <span class="tl-track"><span class="tl-bar ${x.n ? 'on' : ''} ${idle ? 'ghost' : ''}" style="height:${h}%"></span></span>
          <span class="tl-m">${esc(x.label)}</span>
        </button>`;
    }).join('');
    const emptyOverlay = idle ? `
      <div class="tl-empty">
        <span class="tl-empty-ic">${IC('cal')}</span>
        <b>${esc(tr('Nothing due yet'))}</b>
        <span>${esc(tr('No data yet. Bars appear here once something has a due date.'))}</span>
        <button type="button" class="btn small" data-action="home-add" data-kind="renewal">${esc(tr('Add a bill or date'))}</button>
      </div>` : '';
    return `<div class="tline-wrap ${idle ? 'idle' : ''}"><div class="tline ${idle ? 'idle' : ''}">${cols}</div>${emptyOverlay}</div>
      ${idle ? '' : `<p class="panel-note">${esc(tr('Busiest month'))}: <b>${esc(busiest.long)}</b> &middot; ${esc(tr('{n} due', { n: busiest.n }))}${busiest.spend ? ' &middot; ' + esc(money(busiest.spend)) : ''}. ${esc(tr('Tap a month to open it in the calendar.'))}</p>`}`;
  }

  const schSorted = list => list.slice().sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99') || (a.createdAt || '').localeCompare(b.createdAt || ''));
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };

  // Does a schedule item fall on this day? One-off items match their date; repeating ones start on their date and then repeat.
  const schOccurs = (x, iso) => {
    if (!x.repeat) return x.date === iso;
    if (iso < x.date) return false;
    if (x.repeat === 'daily') return true;
    const a = parseISO(x.date), b = parseISO(iso);
    if (x.repeat === 'weekly') return a.getDay() === b.getDay();
    if (x.repeat === 'monthly') return b.getDate() === Math.min(a.getDate(), new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate());
    return false;
  };
  const schOn = iso => db.schedule.filter(x => schOccurs(x, iso));
  const schDone = (x, iso) => (x.repeat ? (x.doneDates || []).includes(iso) : !!x.done);
  const REPEAT_LABEL = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' };
  const REPEAT_SHORT = [['', 'Once'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
  // Round option chips (radio buttons) instead of a dropdown.
  const repPick = cur => `<div class="rep-pick" role="radiogroup" aria-label="${esc(tr('Repeat'))}">${REPEAT_SHORT.map(([v, l]) =>
    `<label><input type="radio" name="repeat" value="${v}" ${(cur || '') === v ? 'checked' : ''}><span>${esc(tr(l))}</span></label>`).join('')}</div>`;
  const normTime = v => {
    const dg = String(v || '').replace(/\D/g, '');
    if (dg.length === 4 || dg.length === 2) { const hh = dg.slice(0, 2), mm = dg.length === 4 ? dg.slice(2) : '00'; if (+hh < 24 && +mm < 60) return hh + ':' + mm; }
    return '';
  };

  const schRow = (x, iso, lite) => {
    const done = schDone(x, iso);
    return `<div class="sch-row ${done ? 'done' : ''}">
      <button type="button" class="sch-check" data-action="sch-toggle" data-id="${esc(x.id)}" data-date="${esc(iso)}" role="checkbox" aria-checked="${done ? 'true' : 'false'}" aria-label="${esc(tr('Mark as done'))}">${done ? '&#10003;' : ''}</button>
      <span class="sch-time">${esc(x.time || '')}</span>
      <span class="sch-title" data-action="sch-edit" data-id="${esc(x.id)}">${esc(x.title)}${x.repeat ? ` <span class="sch-rep">&#8635; ${esc(tr(REPEAT_LABEL[x.repeat]))}</span>` : ''}</span>
      ${lite ? '' : `<button type="button" class="icon-btn" data-action="sch-edit" data-id="${esc(x.id)}" aria-label="${esc(tr('Edit'))}">${IC('edit')}</button>
      <button type="button" class="icon-btn" data-action="sch-del" data-id="${esc(x.id)}" aria-label="${esc(tr('Delete'))}">&times;</button>`}
    </div>`;
  };

  const calEmpty = (icon, txt) => `<div class="cal-empty">${IC(icon)}<span>${esc(txt)}</span></div>`;

  // Everything for one day. The sheet opens in view mode; tapping a box switches that part (schedule, habits, diary) to edit mode.
  function dayHtml(iso) {
    const ed = ui.dayEdit || {}, t = todayISO();
    const due = getEvents(iso, iso).filter(e => e.date === iso);
    const daySch = schSorted(schOn(iso));
    const box = (k, txt, extra) => `<button type="button" class="day-box ${extra || ''}" data-action="day-edit" data-k="${k}">${txt}</button>`;
    const off = (k, label) => `<button type="button" class="link-btn day-off" data-action="day-edit" data-k="${k}" data-off="1">${esc(tr(label))}</button>`;

    const rem = iso === t ? todayRows(true) : [];
    const remind = rem.length ? `<div class="cal-sec"><h5 class="cal-sub">${esc(tr('Reminders'))}</h5><div class="td-list">${rem.join('')}</div></div>` : '';
    const sch = `<div class="cal-sec sch-block">
          <h5 class="cal-sub">${esc(tr('My schedule'))}</h5>
          ${daySch.length ? daySch.map(x => schRow(x, iso, !ed.sch)).join('') : calEmpty('cal', tr('Nothing planned.'))}
          ${ed.sch ? `<form id="sch-form" class="sch-form" data-date="${esc(iso)}" autocomplete="off">
            <input name="title" type="text" maxlength="80" placeholder="${esc(tr('Add to schedule (e.g. Dentist)'))}" aria-label="${esc(tr('My schedule'))}" required>
            <input name="time" type="text" inputmode="none" autocomplete="off" maxlength="5" placeholder="HH:MM" aria-label="${esc(tr('Time'))}" title="${esc(tr('Time'))} (24h)">
            ${repPick('')}
            <button type="submit" class="btn small">${esc(tr('Add'))}</button>
          </form>${off('sch', 'Cancel')}` : box('sch', esc(tr('Add to schedule (e.g. Dentist)')))}
        </div>`;

    const dueB = `<div class="cal-sec due-block">
          <h5 class="cal-sub">${esc(tr('Due this day'))}</h5>
          ${due.length ? due.map(evRow).join('') : calEmpty('check', tr('Nothing due.'))}
        </div>`;

    const hs = activeHabits();
    const ideas = HABIT_IDEAS.filter(n => !db.habits.some(h => h.name === tr(n)));
    const habits = `<div class="cal-sec hb-block">
          <h5 class="cal-sub">${esc(tr('Habits'))}</h5>
          ${hs.length ? hs.map(h => habitRow(h, iso, !ed.hab)).join('') : `<p class="panel-note">${esc(tr('No habits yet. Pick one below or add your own.'))}</p>`}
          ${ed.hab ? `${ideas.length ? `<div class="idea-row">${ideas.map(n => `<button type="button" class="chip-btn" data-action="hb-quick" data-name="${esc(n)}">+ ${esc(tr(n))}</button>`).join('')}</div>` : ''}
          <form id="habit-form" class="mini-form" autocomplete="off">
            <input name="name" type="text" maxlength="60" placeholder="${esc(tr('Add a habit (e.g. Drink water)'))}" aria-label="${esc(tr('Habits'))}" required>
            <div class="wk-pick" role="group" aria-label="${esc(tr('Repeat'))}"><span class="wk-lab">${esc(tr('New habit repeats on'))}</span>${[1, 2, 3, 4, 5, 6, 0].map(i => `<label><input type="checkbox" name="wd" value="${i}" checked><span>${esc(wdNarrow(i))}</span></label>`).join('')}</div>
            <button type="submit" class="btn small">${esc(tr('Add'))}</button>
          </form>${off('hab', 'Done')}` : box('hab', esc(tr('Add a habit (e.g. Drink water)')))}
        </div>`;

    const cur = journalOn(iso), sel = cur ? Number(cur.mood) || 0 : 0;
    const hint = tr(iso === t ? 'One line about today...' : 'One line about this day...');
    const diary = iso > t ? '' : `<div class="cal-sec diary-block">
          <h5 class="cal-sub">${esc(tr('Mood & diary'))}</h5>
          ${ed.diary ? `<form id="journal-form" class="j-form" autocomplete="off">
            <input type="hidden" name="date" value="${esc(iso)}">
            <div class="mood-row">${MOODS.map(m => `<button type="button" class="mood-btn ${sel === m.v ? 'on' : ''}" data-action="mood-pick" data-v="${m.v}" title="${esc(tr(m.en))}" aria-label="${esc(tr(m.en))}">${m.i}</button>`).join('')}</div>
            <input type="hidden" name="mood" value="${sel || ''}">
            <input name="text" type="text" maxlength="120" placeholder="${esc(hint)}" value="${esc(cur ? cur.text : '')}" aria-label="${esc(tr('Mood & diary'))}">
            <button type="submit" class="btn small">${esc(tr('Save'))}</button>
            ${cur ? `<button type="button" class="link-btn" data-action="j-del" data-id="${esc(cur.id)}">${esc(tr('Delete'))}</button>` : ''}
          </form>${off('diary', 'Cancel')}`
          : box('diary', `${sel ? `<span class="j-mood">${window.SHI.face(sel)}</span>` : ''}<span>${esc(cur && cur.text ? cur.text : hint)}</span>`, cur && (sel || cur.text) ? 'filled' : '')}
        </div>`;

    return `<div id="day-modal">${remind}${sch}${dueB}${habits}${diary}</div>`;
  }
  function openDayModal(iso, edit) {
    ui.dayEdit = Object.assign({}, edit);
    openModal(fmtDate(iso), dayHtml(iso));
    ui.dayModal = iso;
  }
  // Re-draw the open day sheet after something in it changed.
  function refreshDayModal() {
    if (!ui.dayModal) return;
    const body = $('#day-modal') && $('#modal-root .sheet-body');
    if (body) body.innerHTML = dayHtml(ui.dayModal); else ui.dayModal = null;
  }

  function calendarHtml() {
    const first = parseISO(ui.calMonth);
    const y = first.getFullYear(), m = first.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const start = toISO(first), end = toISO(new Date(y, m, days));
    const evs = getEvents(start, end);
    const byDay = {};
    evs.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
    const schByDay = {};
    for (let d = 1; d <= days; d++) { const iso = toISO(new Date(y, m, d)); const l = schOn(iso); if (l.length) schByDay[iso] = l; }
    const today = todayISO();
    let cells = '<span class="cal-blank"></span>'.repeat((first.getDay() + 6) % 7);
    for (let d = 1; d <= days; d++) {
      const iso = toISO(new Date(y, m, d));
      const n = (byDay[iso] || []).length;
      const sn = (schByDay[iso] || []).length;
      const jm = journalOn(iso), mf = jm && Number(jm.mood) ? window.SHI.face(jm.mood) : '';
      cells += `<button type="button" class="cal-day ${iso === today ? 'today' : ''} ${n || sn ? 'has' : ''} ${mf ? 'has-mood' : ''} ${n ? urgency(daysUntil(iso)) : ''}" data-action="cal-day" data-date="${iso}"><span>${d}</span>${mf ? `<span class="cal-mood">${mf}</span>` : ''}${n || sn ? `<span class="cal-dots">${n ? '<i class="cal-dot"></i>' : ''}${sn ? '<i class="cal-dot sch"></i>' : ''}</span>` : ''}</button>`;
    }
    return `<div id="cal">
      <div class="cal-head">
        <button type="button" class="icon-btn" data-action="cal-nav" data-d="-1" aria-label="${esc(tr('Previous month'))}">&#8249;</button>
        <span class="cal-title"><b>${esc(first.toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' }))}</b>${ui.calMonth !== todayISO().slice(0, 8) + '01' ? `<button type="button" class="cal-today" data-action="cal-today" title="${esc(tr('Back to today'))}">${esc(tr('Today'))}</button>` : ''}</span>
        <button type="button" class="icon-btn" data-action="cal-nav" data-d="1" aria-label="${esc(tr('Next month'))}">&#8250;</button>
      </div>
      <div class="cal-grid">${Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(LOCALE(), { weekday: 'narrow' })).map(w => `<span class="cal-w">${w}</span>`).join('')}${cells}</div>
      <p class="panel-note">${esc(tr('Tap a day to see or add your schedule.'))}</p>
    </div>`;
  }

  function spendHtml() {
    const from = todayISO();
    const endD = parseISO(from);
    endD.setFullYear(endD.getFullYear() + 1);
    endD.setDate(endD.getDate() - 1);
    const to = toISO(endD);
    const rows = db.renewals
      .filter(r => r.status === 'active' && !r.isTrial && Number(r.amount) > 0)
      .map(r => ({ r, total: occurrences(r, from, to).length * Number(r.amount) }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total);
    if (!rows.length) {
      return `<div class="spend-total"><b>${esc(money(0))}</b><span>${esc(money(0))} ${esc(tr('per month on average'))}</span></div>
        <div class="split"></div>
        <div class="legend"><span><i class="lgdot a"></i>${esc(tr('Subscriptions'))} ${esc(money(0))}</span><span><i class="lgdot b"></i>${esc(tr('IDs & Renewals'))} ${esc(money(0))}</span></div>
        <p class="panel-note">${esc(tr('No data yet. Add a subscription or renewal with an amount.'))}</p>`;
    }
    const sum = f => rows.filter(f).reduce((s, x) => s + x.total, 0);
    const subs = sum(x => x.r.type === 'subscription');
    const pl = sum(x => x.r.type === 'paylater');
    const docs = sum(x => x.r.type !== 'subscription' && x.r.type !== 'paylater');
    const total = subs + pl + docs;
    const pct = v => Math.round(v / total * 100);
    const pS = pct(subs), pP = pct(pl), pD = Math.max(0, 100 - pS - pP);
    return `<div class="spend-total"><b>${esc(money(total))}</b><span>${esc(money(total / 12))} ${esc(tr('per month on average'))}</span></div>
      <div class="split"><i class="seg a" style="width:${pS}%"></i><i class="seg c" style="width:${pP}%"></i><i class="seg b" style="width:${pD}%"></i></div>
      <div class="legend">
        <span><i class="lgdot a"></i>${esc(tr('Subscriptions'))} ${esc(money(subs))} (${pS}%)</span>
        ${pl ? `<span><i class="lgdot c"></i>${esc(tr('PayLater'))} ${esc(money(pl))} (${pP}%)</span>` : ''}
        <span><i class="lgdot b"></i>${esc(tr('IDs & Renewals'))} ${esc(money(docs))} (${pD}%)</span>
      </div>
      <h4>${esc(tr('Biggest costs'))}</h4>
      ${rows.slice(0, 3).map(x => `<div class="ev-row"><span class="nm">${esc(x.r.title)}</span><b>${esc(money(x.total))}</b></div>`).join('')}`;
  }

  function upcomingHtml() {
    const from = todayISO();
    const endD = parseISO(from);
    endD.setDate(endD.getDate() + 90);
    const evs = getEvents('0000-01-01', toISO(endD)).filter(e => !(e.kind === 'Warranty' && e.date < from)).slice(0, 6);
    return evs.length ? evs.map(evRow).join('') : `<p class="panel-note">${esc(tr('Nothing coming up in the next 90 days. Add an item, renewal or record to get started.'))}</p>`;
  }

  /* ------------------------------------------------------------------ */
  /* Help for new users: English + Chinese text, start card, sample data, */
  /* page help banners and friendly empty states                          */
  /* ------------------------------------------------------------------ */
  const HIDE_START_KEY = 'stowhive.start.hide';
  const HELP_KEY = 'stowhive.help';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  // An English line with its Chinese line underneath.
  const bi = en => esc(tr(en));

  // ----- Sample data: every sample record carries sample:true so it can be removed in one tap -----
  const offsetDay = n => { const d = parseISO(todayISO()); d.setDate(d.getDate() + n); return toISO(d); };
  const hasSample = () => [db.assets, db.renewals].some(a => a.some(x => x.sample));

  function sampleData() {
    const base = () => ({ id: uid(), createdAt: new Date().toISOString(), sample: true });
    const lastService = offsetDay(-170);
    const asset = o => ({ ...base(), purchaseDate: '', price: '', warrantyExpiry: '', locationText: '', maintenanceCycleMonths: '', lastMaintenanceDate: '', nextMaintenanceDate: '', maintenanceNote: '', ...o });
    const renew = o => ({ ...base(), status: 'active', isTrial: false, ...o });
    return {
      assets: [
        asset({ name: 'Canon camera', category: 'Electronics', purchaseDate: offsetDay(-200), price: 3200, warrantyExpiry: offsetDay(165), locationText: 'Bedroom closet, 2nd shelf' }),
        asset({ name: 'Living room aircon', category: 'Appliances', purchaseDate: offsetDay(-700), price: 2400, warrantyExpiry: offsetDay(20), locationText: 'Living room', maintenanceCycleMonths: 6, lastMaintenanceDate: lastService, nextMaintenanceDate: addMonths(lastService, 6) }),
        asset({ name: 'Spare house keys', category: 'Other', locationText: 'Kitchen drawer, left side' })
      ],
      renewals: [
        renew({ title: 'Netflix', type: 'subscription', amount: 55, cycle: 'monthly', nextDueDate: offsetDay(2), remindDaysBefore: 3 }),
        renew({ title: 'iCloud', type: 'subscription', amount: 12.9, cycle: 'monthly', nextDueDate: offsetDay(18), remindDaysBefore: 3 }),
        renew({ title: 'Passport', type: 'document', amount: 0, cycle: 'onetime', nextDueDate: offsetDay(25), remindDaysBefore: 30 }),
        renew({ title: 'Car insurance', type: 'document', amount: 1200, cycle: 'yearly', nextDueDate: offsetDay(90), remindDaysBefore: 30 })
      ]
    };
  }

  function loadSample() {
    if (hasSample()) return;
    const s = sampleData();
    if (commit(() => { db.assets.push(...s.assets); db.renewals.push(...s.renewals); })) {
      renderAll();
      toast(tr('Sample data added'));
    }
  }

  async function clearSample() {
    const ok = await confirmDialog({
      title: tr('Remove sample data?'),
      message: tr('Only the sample items are removed. Your own data stays.'),
      confirmLabel: tr('Remove')
    });
    if (!ok) return;
    if (commit(() => { ['assets', 'renewals'].forEach(k => { db[k] = db[k].filter(x => !x.sample); }); })) {
      renderAll();
      toast(tr('Sample data removed'));
    }
  }

  // ----- Home: "Get started" card and the sample-data bar -----
  function startCardHtml() {
    if (lsGet(HIDE_START_KEY) === '1') return '';
    const real = a => a.some(x => !x.sample);
    const steps = [
      { kind: 'todo', done: real(db.todos) || real(db.schedule), en: 'Write your first to-do',
        ex: 'e.g. Call the bank, or pay the water bill.' },
      { kind: 'renewal', done: real(db.renewals), en: 'Add a bill or expiry date',
        ex: 'e.g. Netflix every month, or your passport expiry.' }
    ];
    if (steps.every(s => s.done)) return '';
    const n = steps.filter(s => s.done).length;
    return `<section class="panel start">
      <div class="start-head">
        <h3>${esc(tr('Get started in 2 steps'))}<small class="zh">${n}/${steps.length}</small></h3>
        <button type="button" class="link-btn" data-action="start-hide">${esc(tr('Hide'))}</button>
      </div>
      <div class="start-steps">${steps.map((s, i) => `
        <button type="button" class="start-step ${s.done ? 'done' : ''}" data-action="home-add" data-kind="${s.kind}">
          <span class="st-n">${s.done ? '&#10003;' : i + 1}</span>
          <span class="st-t"><b>${esc(tr(s.en))}</b><small>${esc(tr(s.ex))}</small></span>
          <span class="st-go" aria-hidden="true">+</span>
        </button>`).join('')}</div>
      ${hasSample() ? '' : `<div class="start-sample">
        <span>${esc(tr('Want to look around first?'))}</span>
        <button type="button" class="btn small ghost" data-action="load-sample">${esc(tr('Try sample data'))}</button>
      </div>`}
    </section>`;
  }

  const sampleBarHtml = () => hasSample() ? `
    <div class="sample-bar">
      <span class="sb-t">${IC('flask')} ${esc(tr('Sample data is showing'))}</span>
      <button type="button" class="btn small" data-action="clear-sample">${esc(tr('Remove'))}</button>
    </div>` : '';

  // ----- Page help banners (open by default while a page is empty, then collapsed) -----
  const PAGE_HELP = {
    assets: {
      what: ['Remember where things are kept, and when their warranty ends.'],
      eg: [
        ['Passport: top drawer'],
        ['Aircon: warranty ends in 2027, service every 6 months']
      ],
      tips: [
        ['Tap + Add Item, pick a category and answer a few questions.'],
        ['Tap a card to see its details. After a service, tap Log maintenance and the next date is worked out for you.'],
        ['Search by name or place, for example "drawer".']
      ]
    },
    renewals: {
      what: ['Never miss a payment or an expiry date.'],
      eg: [
        ['Subscriptions: Netflix, Spotify, ChatGPT, iCloud'],
        ['IDs & renewals: passport, driving licence, road tax, car insurance'],
        ['PayLater: SPayLater, Atome, Grab PayLater']
      ],
      tips: [
        ['Tap a quick-add button, or + Add Renewal, then pick the date.'],
        ['After you pay or renew, tap Renewed. The next date is set for you.'],
        ['After each PayLater instalment, tap Paid. The count goes down and the next date moves a month.'],
        ['Colours: red = 3 days or less, yellow = within 30 days, green = safe.']
      ]
    }
  };

  const helpPref = () => { try { return JSON.parse(lsGet(HELP_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const helpIsOpen = tab => {
    const p = helpPref();
    if (tab in p) return !!p[tab];
    const n = { assets: db.assets, renewals: db.renewals }[tab].length;
    return n === 0;
  };

  function renderHelp() {
    Object.keys(PAGE_HELP).forEach(tab => {
      const el = $('#help-' + tab);
      if (!el) return;
      const h = PAGE_HELP[tab];
      const open = helpIsOpen(tab);
      el.innerHTML = `
        <div class="page-help ${open ? 'open' : ''}">
          <button type="button" class="ph-head" data-action="help-toggle" data-tab="${tab}" aria-expanded="${open}">
            <span class="ph-i">i</span>
            <span class="ph-t">${esc(tr('What is this page?'))}</span>
            <span class="ph-chev" aria-hidden="true"></span>
          </button>
          <div class="ph-body">
            <p class="ph-what"><b>${bi(h.what[0], h.what[1])}</b></p>
            <h5>${esc(tr('Examples'))}</h5>
            <ul>${h.eg.map(x => `<li>${bi(x[0], x[1])}</li>`).join('')}</ul>
            <h5>${esc(tr('How to use'))}</h5>
            <ul>${h.tips.map(x => `<li>${bi(x[0], x[1])}</li>`).join('')}</ul>
          </div>
        </div>`;
    });
  }

  // ----- Friendly empty state: what goes here, an example, and a button -----
  const emptyCard = o => `
    <div class="empty rich">
      <div class="empty-ico">${window.SHI.art(({ '&#128230;': 'box', '&#128257;': 'loop', '&#128196;': 'doc', '&#128179;': 'card' })[o.ico] || 'other')}</div>
      <b>${esc(tr(o.en))}</b>
      <p>${esc(tr(o.egEn))}</p>
    </div>`;


  /* ------------------------------------------------------------------ */
  /* Daily spending and monthly budget                                   */
  /* ------------------------------------------------------------------ */
  const BASE_CATS = [
    { k: 'food', i: IC('food'), en: 'Food', ci: 0 },
    { k: 'transport', i: IC('car'), en: 'Transport', ci: 1 },
    { k: 'shopping', i: IC('bag'), en: 'Shopping', ci: 2 },
    { k: 'home', i: IC('home'), en: 'Household', ci: 3 },
    { k: 'fun', i: IC('fun'), en: 'Fun', ci: 4 },
    { k: 'health', i: IC('pill'), en: 'Health', ci: 5 },
    { k: 'other', i: IC('other'), en: 'Other', ci: 6 }
  ];
  const CAT_ICONS = ['food', 'car', 'bag', 'home', 'fun', 'pill', 'gift', 'pin', 'flame', 'phone', 'music', 'film', 'star', 'tag', 'wrench', 'plug'];
  const customCatsOf = () => ((db.budget && db.budget.customCats) || []).map(c => ({ k: c.k, i: IC(c.ic), en: c.name, ci: c.ci, custom: true }));
  // allCats: every category ever known (used to show old records). expCats: the ones the user currently uses.
  const allCats = () => [...BASE_CATS, ...customCatsOf()];
  const expCats = () => {
    const hid = (db.budget && db.budget.hiddenCats) || [];
    return [...BASE_CATS.filter(c => c.k !== 'other' && !hid.includes(c.k)), ...customCatsOf(), BASE_CATS[BASE_CATS.length - 1]];
  };
  const selCat = () => { const l = expCats(); return l.some(c => c.k === ui.lastCat) ? ui.lastCat : l[0].k; };
  const catOf = x => allCats().find(c => c.k === (x && x.cat)) || BASE_CATS[BASE_CATS.length - 1];
  const expCatTotals = list => {
    const m = new Map();
    list.forEach(x => { const c = catOf(x); m.set(c.k, (m.get(c.k) || 0) + (Number(x.amount) || 0)); });
    return [...m.entries()].map(([k, total]) => ({ c: allCats().find(c => c.k === k), total: r2c(total) }))
      .sort((a, b) => b.total - a.total);
  };
  function catBreakdownHtml(list, title) {
    const tot = sumAmt(list);
    if (!tot) return '';
    const rows = expCatTotals(list), caps = (db.budget && db.budget.caps) || {}, pal = window.SHI.pal;
    return `<div class="cat-bd"><h4>${esc(title)}</h4><div class="cat-wrap">${rows.length > 1 ? window.SHI.donut(rows.map(r => ({ v: r.total, k: r.c.ci }))) : ''}<div class="cat-rows">${rows.map(r => {
      const pct = Math.round(r.total / tot * 100), cap = caps[r.c.k], over = cap && r.total > cap;
      return `<div class="cat-row"><span class="cat-n"><i class="sw" style="background:${pal[r.c.ci]}"></i>${r.c.i} ${esc(tr(r.c.en))}</span>
        <span class="cat-bar ${over ? 'over' : ''}"><i style="width:${cap ? Math.min(100, Math.round(r.total / cap * 100)) : Math.max(pct, 3)}%"></i></span>
        <span class="cat-v ${over ? 'neg' : ''}">${esc(money(r.total))} <small>${cap ? '/ ' + esc(money(cap)) : pct + '%'}</small></span></div>`;
    }).join('')}</div></div></div>`;
  }
  const monthOf = iso => iso.slice(0, 7);
  const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const r2c = n => Math.round(n * 100) / 100;
  const sumAmt = list => r2c(list.reduce((t, x) => t + (Number(x.amount) || 0), 0));

  function dayLabel(iso) {
    const d = daysUntil(iso);
    if (d === 0) return tr('Today');
    if (d === -1) return tr('Yesterday');
    return parseISO(iso).toLocaleDateString(LOCALE(), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function expenseStats() {
    const today = todayISO();
    const ym = monthOf(today);
    const dim = daysInMonth(ym);
    const day = Number(today.slice(8));
    const spent = sumAmt(db.expenses.filter(e => monthOf(e.date) === ym));
    const budget = Number(db.budget.amount) || 0;
    const left = r2c(budget - spent);
    const daysLeft = dim - day + 1; // today counts
    const endISO = `${ym}-${pad(dim)}`;
    const pym = (([y, m]) => m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`)(ym.split('-').map(Number));
    const prevSame = sumAmt(db.expenses.filter(e => monthOf(e.date) === pym && Number(e.date.slice(8)) <= day));
    const bills = r2c(db.renewals
      .filter(r => r.status === 'active' && !r.isTrial && Number(r.amount) > 0)
      .reduce((t, r) => t + occurrences(r, today, endISO).length * Number(r.amount), 0));
    return {
      today, ym, dim, day, spent, budget, left, daysLeft, bills, prevSame,
      todaySum: sumAmt(db.expenses.filter(e => e.date === today)),
      perDay: left > 0 ? left / daysLeft : 0,
      avg: spent / day
    };
  }

  const sortedExpenses = list => list.slice().sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  function expenseRow(x, showDay = true) {
    return `<div class="ev-row exp-row">
      <span class="nm"><small class="exp-day">${showDay ? esc(dayLabel(x.date)) + ' &middot; ' : ''}${catOf(x).i} ${esc(tr(catOf(x).en))}</small>${x.note ? esc(x.note) : `<span class="muted">${esc(tr('No note'))}</span>`}</span>
      <span class="ev-r"><b>${esc(money(x.amount))}</b>
        <button type="button" class="icon-btn" data-action="exp-del" data-id="${esc(x.id)}" aria-label="${esc(tr('Delete'))}">&times;</button></span>
    </div>`;
  }

  // Suggested share of the monthly budget for each category (adds up to 100)
  const SPLIT = { food: 35, transport: 15, shopping: 10, home: 20, fun: 10, health: 5, other: 5 };

  // Pie of how the monthly budget is planned across categories, with what is already spent in each.
  function budgetPlanHtml(s) {
    const caps = (db.budget && db.budget.caps) || {};
    const capRows = expCats().filter(c => caps[c.k] > 0).map(c => ({ c, v: caps[c.k] }));
    if (!s.budget && !capRows.length) return '';
    const title = tr('Budget plan this month');
    if (!capRows.length) {
      return `<div class="plan"><h4>${esc(title)}</h4>
        <p class="panel-note">${esc(tr('Set a limit for each category to see how your budget is split.'))}</p>
        <div class="card-actions" style="padding:8px 0 0">
          <button type="button" class="btn small" data-action="budget-suggest">${esc(tr('Use suggested split'))}</button>
          <button type="button" class="btn small ghost" data-action="budget-set" data-caps="1">${esc(tr('Set my own'))}</button>
        </div></div>`;
    }
    const capsTotal = r2c(capRows.reduce((t, r) => t + r.v, 0));
    const free = Math.max(0, r2c(s.budget - capsTotal));
    const total = capsTotal + free;
    const spentBy = new Map(expCatTotals(db.expenses.filter(e => monthOf(e.date) === s.ym)).map(r => [r.c.k, r.total]));
    const pal = window.SHI.pal;
    const mny = n => (Number.isInteger(n) ? `${CURRENCY} ${n.toLocaleString('en-US')}` : money(n));
    const slices = capRows.map(r => ({ v: r.v, sp: spentBy.get(r.c.k) || 0, k: r.c.ci }));
    if (free > 0) slices.push({ v: free, sp: 0, plain: true, color: 'var(--track)' });
    const pct = v => Math.round(v / total * 100);
    return `<div class="plan"><h4>${esc(title)}</h4>
      <div class="plan-wrap">${window.SHI.planPie(slices)}<div class="plan-rows">
        ${capRows.map(r => { const sp = spentBy.get(r.c.k) || 0; return `<div class="plan-row"><span class="cat-n"><i class="sw" style="background:${pal[r.c.ci % pal.length]}"></i>${r.c.i} ${esc(tr(r.c.en))}</span>
          <span class="plan-v"><b>${esc(mny(r.v))}</b> <small>${pct(r.v)}%</small><em class="${sp > r.v ? 'neg' : ''}">${esc(tr('Spent {amount}', { amount: money(sp) }))}</em></span><span class="pbar ${sp > r.v ? 'over' : sp >= r.v * 0.8 ? 'warn' : ''}"><i style="width:${sp > 0 ? Math.max(2, Math.min(100, Math.round(sp / r.v * 100))) : 0}%;min-width:${sp > 0 ? 6 : 0}px;background:${pal[r.c.ci % pal.length]}"></i></span></div>`; }).join('')}
        ${free > 0 ? `<div class="plan-row"><span class="cat-n"><i class="sw" style="background:var(--track);border:1px solid var(--line)"></i>${esc(tr('Not planned'))}</span><span class="plan-v"><b>${esc(mny(free))}</b> <small>${pct(free)}%</small></span></div>` : ''}
      </div></div>
      ${s.budget > 0 && capsTotal > s.budget ? `<p class="panel-note warn">${esc(tr('Limits add up to {amount}, more than your budget.', { amount: money(capsTotal) }))}</p>` : ''}
      <button type="button" class="link-btn" data-action="budget-set" data-caps="1">${esc(tr('Edit limits'))}</button></div>`;
  }

  // Expense entry form. id is 'exp-form' on the Budget page and 'qa-exp' inside the Quick Add dialog.
  const expFormHtml = (id, today) => `
      <form id="${id}" class="exp-form" autocomplete="off">
        <div class="cat-pick" role="radiogroup" aria-label="${esc(tr('Category'))}">${expCats().map(c =>
          `<label class="cat-chip"><input type="radio" name="cat" value="${c.k}" ${c.k === selCat() ? 'checked' : ''}><span>${c.i} ${esc(tr(c.en))}</span></label>`).join('')}</div>
        <input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" max="99999999" placeholder="${esc(tr('Amount'))} (${CURRENCY})" aria-label="${esc(tr('Amount'))}" required>
        <input name="note" type="text" maxlength="60" placeholder="${esc(tr('Spent on what? (optional)'))}" aria-label="${esc(tr('Spent on what? (optional)'))}">
        <input name="date" type="date" value="${today}" aria-label="${esc(tr('Date'))}" required>
        <label class="check rep-chk"><input type="checkbox" name="rep"> <span>${esc(tr('Repeat every month'))}</span></label>
        <button type="submit" class="btn primary">${esc(tr('Add spending'))}</button>
      </form>`;

  function budgetHtml(limit = 5) {
    const s = expenseStats();
    const has = s.budget > 0;
    const pct = has ? Math.round(s.spent / s.budget * 100) : 0;
    const tone = !has ? '' : s.spent > s.budget ? 'over' : pct >= 80 ? 'warn' : '';
    const recent = sortedExpenses(db.expenses).slice(0, limit);
    const diff = s.prevSame > 0 ? Math.round((s.spent - s.prevSame) / s.prevSame * 100) : null;
    return `<div class="bd-grid"><div class="bd-l">
      <div class="bd-top">
        <div class="bd-main">
          <div class="bd-label">${esc(tr('Spent this month'))}</div>
          <div class="bd-big">${esc(money(s.spent))}${has ? ` <small>/ ${esc(money(s.budget))}</small>` : ''}</div>
        </div>
        ${has ? window.SHI.ring(pct, tone, pct + '%') : ''}<button type="button" class="btn small ghost" data-action="budget-set">${esc(tr(has ? 'Edit budget' : 'Set budget'))}</button>
      </div>
      ${diff !== null ? `<p class="bd-cmp ${diff > 0 ? 'up' : 'down'}">${esc(tr('Vs same days last month'))}: <b>${diff > 0 ? '+' : ''}${diff}%</b> (${esc(money(s.prevSame))})</p>` : ''}
      <div class="bd-stats">
        <div><span>${esc(tr('Today'))}</span><b>${esc(money(s.todaySum))}</b></div>
        <div><span>${esc(tr('Can spend per day'))}</span><b>${has ? esc(money(s.perDay)) : '-'}</b></div>
        <div><span>${esc(tr('Daily average'))}</span><b>${esc(money(s.avg))}</b></div>
      </div>
      ${budgetPlanHtml(s)}
      ${Object.values((db.budget && db.budget.caps) || {}).some(v => v > 0) ? '' : catBreakdownHtml(db.expenses.filter(e => monthOf(e.date) === s.ym), tr('Where it went this month'))}
      ${has ? '' : `<p class="panel-note">${esc(tr('Set a monthly budget to see how much you can spend each day.'))}</p>`}
      ${s.bills > 0 ? `<p class="panel-note">${esc(tr('Bills & subscriptions still due this month: {amount} (not counted above)', { amount: money(s.bills) }))}</p>` : ''}
      </div><div class="bd-r">
      ${expFormHtml('exp-form', s.today)}
      ${recent.length ? `<div class="exp-list">${recent.map(x => expenseRow(x)).join('')}</div>
        <button type="button" class="link-btn" data-action="exp-all">${esc(tr('See all spending'))}</button>`
        : `<p class="panel-note">${esc(tr('No spending logged yet. Add what you spent today.'))}</p>`}
      </div></div>`;
  }

  // Category rows inside the budget form: limit boxes, remove buttons, add-category box.
  function capsInnerHtml(vals) {
    vals = vals || {};
    const caps = db.budget.caps || {};
    const rows = expCats().map(c => {
      const v = vals['cap_' + c.k] != null ? vals['cap_' + c.k] : (caps[c.k] || '');
      return `<div class="cap-row"><span class="cap-n">${c.i} ${esc(tr(c.en))}</span><div class="cap-r"><div class="stepper small"><button type="button" class="step-btn" data-step="-1" data-for="cap_${c.k}" aria-label="${esc(tr('Subtract'))}">&minus;</button><input name="cap_${c.k}" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(String(v))}" placeholder="-"><button type="button" class="step-btn" data-step="1" data-for="cap_${c.k}" aria-label="${esc(tr('Add'))}">+</button></div>${c.k !== 'other' ? `<button type="button" class="icon-btn cap-x" data-cat-del="${c.k}" aria-label="${esc(tr('Remove category'))}">&times;</button>` : '<span class="cap-x-ph"></span>'}</div></div>`;
    }).join('');
    const hid = ((db.budget && db.budget.hiddenCats) || []).map(k => BASE_CATS.find(c => c.k === k)).filter(Boolean);
    return `${rows}
      <div class="cat-add"><h4 class="rec-h">${esc(tr('Add category'))}</h4>
        <div class="cat-pick">${CAT_ICONS.map((n, i) => `<label class="cat-chip"><input type="radio" name="newic" value="${n}" ${i === 0 ? 'checked' : ''}><span>${IC(n)}</span></label>`).join('')}</div>
        <div class="cat-add-row"><input id="cat-new" type="text" maxlength="14" placeholder="${esc(tr('New category name'))}" aria-label="${esc(tr('New category name'))}" autocomplete="off"><button type="button" class="btn small" data-cat-add="1">${esc(tr('Add'))}</button></div>
        ${hid.length ? `<h4 class="rec-h">${esc(tr('Removed categories (tap to bring back)'))}</h4><div class="cat-pick">${hid.map(c => `<button type="button" class="chip-btn" data-cat-restore="${c.k}">+ ${c.i} ${esc(tr(c.en))}</button>`).join('')}</div>` : ''}
      </div>`;
  }

  function openBudgetForm(openCaps) {
    const cur = Number(db.budget.amount) || 0;
    const dim = daysInMonth(monthOf(todayISO()));
    openModal(tr('Monthly budget'), `
      <form id="bd-form">
        <div class="field step-bar"><span>${esc(tr('Amount to add or subtract each tap'))} (${CURRENCY})</span>
          <input id="bd-step" type="number" inputmode="decimal" min="0.01" step="any" value="100" aria-label="${esc(tr('Amount to add or subtract each tap'))}"></div>
        <div class="field"><span>${esc(tr('Budget for each month'))} (${CURRENCY})</span>
          <div class="stepper">
            <button type="button" class="step-btn" data-step="-1" data-for="amount" aria-label="${esc(tr('Subtract'))}">&minus;</button>
            <input name="amount" type="number" value="${val(cur || '')}" inputmode="decimal" min="0" max="99999999" step="0.01" placeholder="1500" required>
            <button type="button" class="step-btn" data-step="1" data-for="amount" aria-label="${esc(tr('Add'))}">+</button>
          </div></div>
        <p class="card-sub" id="bd-hint"></p>
        <details class="caps" ${Object.keys(db.budget.caps || {}).length || openCaps ? 'open' : ''}><summary>${esc(tr('Limit per category (optional)'))}</summary><div id="caps-inner">${capsInnerHtml()}</div><p class="card-sub" id="bd-alloc"></p></details>
        ${(db.budget.recurring || []).length ? `<h4 class="rec-h">${esc(tr('Repeats every month'))}</h4>${db.budget.recurring.map(r => `<div class="rec-row"><span>${catOf(r).i} ${esc(r.note || tr(catOf(r).en))} &middot; ${esc(tr('Day {n}', { n: r.day }))}</span><b>${esc(money(r.amount))}</b><button type="button" class="icon-btn" data-rec-del="${esc(r.id)}" aria-label="${esc(tr('Delete'))}">&times;</button></div>`).join('')}` : ''}
        <button type="submit" class="btn primary block">${esc(tr('Save'))}</button>
        ${cur ? `<button type="button" class="btn ghost block" data-bd="clear" style="margin-top:8px">${esc(tr('Remove budget'))}</button>` : ''}
      </form>`, root => {
      const form = $('#bd-form', root);
      root.querySelectorAll('[data-rec-del]').forEach(b => b.addEventListener('click', () => {
        if (commit(() => { db.budget = { ...db.budget, recurring: db.budget.recurring.filter(x => x.id !== b.dataset.recDel), updatedAt: new Date().toISOString() }; })) b.closest('.rec-row').remove();
      }));
      const readCaps = () => { const c = {}; expCats().forEach(x => { const el = form.elements['cap_' + x.k]; const v = el ? Math.round(Number(el.value) * 100) / 100 : 0; if (v > 0) c[x.k] = v; }); return c; };
      const capVals = () => { const o = {}; form.querySelectorAll('input[name^="cap_"]').forEach(el => { o[el.name] = el.value; }); return o; };
      const renderCaps = vals => { $('#caps-inner', root).innerHTML = capsInnerHtml(vals); alloc(); };
      const stamp = () => new Date().toISOString();
      const addCat = () => {
        const inp = $('#cat-new', root);
        const name = inp.value.trim().slice(0, 14);
        if (!name) { toast(tr('Enter a category name')); return; }
        if (expCats().some(c => tr(c.en).toLowerCase() === name.toLowerCase())) { toast(tr('That category already exists')); return; }
        const mine = db.budget.customCats || [];
        if (mine.length >= 12) { toast(tr('Up to 12 of your own categories')); return; }
        const icEl = form.elements.newic;
        const ic = CAT_ICONS.includes(icEl && icEl.value) ? icEl.value : 'tag';
        const use = {}; mine.forEach(c => { use[c.ci] = (use[c.ci] || 0) + 1; });
        const ci = [7, 8, 9, 10, 11].sort((x, y) => (use[x] || 0) - (use[y] || 0))[0];
        const k = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const vals = capVals();
        if (commit(() => { db.budget = { ...db.budget, customCats: [...mine, { k, name, ic, ci }], updatedAt: stamp() }; })) { renderCaps(vals); refreshSpending(); const n = $('#cat-new', root); if (n) n.focus(); }
      };
      form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cat-new') { e.preventDefault(); addCat(); } });
      form.addEventListener('click', e => {
        const del = e.target.closest('[data-cat-del]'), res = e.target.closest('[data-cat-restore]');
        if (e.target.closest('[data-cat-add]')) { addCat(); return; }
        if (res) {
          const vals = capVals();
          if (commit(() => { db.budget = { ...db.budget, hiddenCats: (db.budget.hiddenCats || []).filter(x => x !== res.dataset.catRestore), updatedAt: stamp() }; })) { renderCaps(vals); refreshSpending(); }
          return;
        }
        if (del) {
          const k = del.dataset.catDel, mine = db.budget.customCats || [], isCustom = mine.some(c => c.k === k);
          if (isCustom && !window.confirm(tr('Delete this category? Past spending in it will show as Other.'))) return;
          const vals = capVals(); delete vals['cap_' + k];
          const caps = { ...(db.budget.caps || {}) }; delete caps[k];
          if (commit(() => { db.budget = { ...db.budget, caps, customCats: mine.filter(c => c.k !== k), hiddenCats: isCustom ? (db.budget.hiddenCats || []) : [...new Set([...(db.budget.hiddenCats || []), k])], updatedAt: stamp() }; })) { renderCaps(vals); refreshSpending(); }
        }
      });
      const hint = () => {
        const v = Number(form.elements.amount.value);
        $('#bd-hint', root).textContent = v > 0 ? tr('About {amount} per day ({n} days this month)', { amount: money(v / dim), n: dim }) : '';
      };
      const alloc = () => {
        const total = Number(form.elements.amount.value) || 0;
        const planned = Math.round(Object.values(readCaps()).reduce((t, x) => t + x, 0) * 100) / 100;
        $('#bd-alloc', root).textContent = !planned ? '' : (total > 0 && planned > total)
          ? tr('Limits add up to {amount}, more than your budget.', { amount: money(planned) })
          : tr('Planned {a}, not planned {b}', { a: money(planned), b: money(Math.max(0, total - planned)) });
      };
      form.addEventListener('input', () => { hint(); alloc(); });
      // + and - buttons: add or subtract the amount in the step box
      form.addEventListener('click', e => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        const inp = form.elements[b.dataset.for];
        const step = Math.abs(Number($('#bd-step', root).value)) || 100;
        const next = Math.min(99999999, Math.max(0, Math.round(((Number(inp.value) || 0) + Number(b.dataset.step) * step) * 100) / 100));
        inp.value = next > 0 || inp.name === 'amount' ? next : '';
        hint(); alloc();
      });
      hint(); alloc();
      const save = (amount, caps) => {
        if (commit(() => { db.budget = { ...db.budget, amount, caps, updatedAt: new Date().toISOString() }; })) {
          closeModal();
          refreshSpending();
          toast(tr(amount > 0 ? 'Budget saved' : 'Budget removed'));
        }
      };
      form.addEventListener('submit', e => {
        e.preventDefault();
        const v = Math.round(Number(form.elements.amount.value) * 100) / 100;
        if (!(v >= 0) || v > 99999999) { toast(tr('Enter an amount above 0')); return; }
        save(v, readCaps());
      });
      const clr = $('[data-bd="clear"]', root);
      if (clr) clr.addEventListener('click', () => save(0, readCaps()));
    });
    const inp = $('#bd-form [name="amount"]');
    if (inp) inp.focus();
  }

  // Full list for one month, grouped by day, with a delete button on every row.
  function expModalHtml(ym) {
    const list = sortedExpenses(db.expenses.filter(e => monthOf(e.date) === ym));
    const cur = monthOf(todayISO());
    const days = ym === cur ? Number(todayISO().slice(8)) : daysInMonth(ym);
    const total = sumAmt(list);
    const groups = [];
    list.forEach(x => {
      const g = groups[groups.length - 1];
      if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] });
    });
    const label = parseISO(ym + '-01').toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
    return `<div id="exp-modal">
      <div class="cal-head">
        <button type="button" class="icon-btn" data-action="exp-month" data-d="-1" aria-label="${esc(tr('Previous month'))}">&#8249;</button>
        <b>${esc(label)}</b>
        <button type="button" class="icon-btn" data-action="exp-month" data-d="1" aria-label="${esc(tr('Next month'))}" ${ym >= cur ? 'disabled' : ''}>&#8250;</button>
      </div>
      <div class="bd-stats">
        <div><span>${esc(tr('Total'))}</span><b>${esc(money(total))}</b></div>
        <div><span>${esc(tr('Daily average'))}</span><b>${esc(money(total / days))}</b></div>
      </div>
      <input type="search" class="exp-q" placeholder="${esc(tr('Search spending'))}" aria-label="${esc(tr('Search spending'))}">
      ${catBreakdownHtml(list, tr('Where it went'))}
      ${groups.length ? groups.map(g => `
        <h4 class="exp-gh"><span>${esc(dayLabel(g.date))}</span><span>${esc(money(sumAmt(g.items)))}</span></h4>
        ${g.items.map(x => expenseRow(x, false)).join('')}`).join('') : `<p class="panel-note">${esc(tr('No spending recorded this month.'))}</p>`}
    </div>`;
  }

  function renderExpModal() {
    if (!ui.expMonth) ui.expMonth = monthOf(todayISO());
    const html = expModalHtml(ui.expMonth);
    if ($('#exp-modal')) $('#modal-root .sheet-body').innerHTML = html;
    else openModal(tr('Spending history'), html);
  }

  // Time box: type 0930 or 9 30 and it shows 09:30
  document.addEventListener('input', e => {
    const el = e.target;
    if (!el.matches || !el.matches('#sch-form [name="time"], #sch-edit [name="time"]')) return;
    let d = el.value.replace(/\D/g, '').slice(0, 4);
    if (d.length === 1 && +d > 2) d = '0' + d;
    el.value = d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
  });

  // Time picker: tap a time box to pick hour and minute from two lists (typing still works).
  let tpEl = null, tpInput = null;
  // Closing also releases focus from the time box, so tapping it again always opens the picker (phones).
  function closeTimePicker(keepFocus) {
    if (!tpEl) return;
    const inp = tpInput;
    tpEl.remove(); tpEl = null; tpInput = null;
    if (inp && keepFocus !== true) { try { inp.blur(); } catch (x) { /* ignore */ } }
  }
  function openTimePicker(input) {
    if (tpInput === input && tpEl) return;
    closeTimePicker();
    tpInput = input;
    const m = /^(\d{1,2}):(\d{2})$/.exec(input.value.trim());
    const st = { h: m && +m[1] < 24 ? +m[1] : null, m: m && +m[2] < 60 ? +m[2] : null };
    const mins = []; for (let i = 0; i < 60; i += 5) mins.push(i);
    if (st.m != null && !mins.includes(st.m)) { mins.push(st.m); mins.sort((x, y) => x - y); }
    const p2 = n => String(n).padStart(2, '0');
    const col = (k, arr) => `<div class="tp-col" data-k="${k}">${arr.map(n => `<button type="button" data-v="${n}" class="${st[k] === n ? 'on' : ''}">${p2(n)}</button>`).join('')}</div>`;
    tpEl = document.createElement('div');
    tpEl.className = 'tp';
    tpEl.setAttribute('role', 'dialog');
    tpEl.innerHTML = `<div class="tp-cols">${col('h', Array.from({ length: 24 }, (_, i) => i))}<span class="tp-sep">:</span>${col('m', mins)}</div>
      <div class="tp-foot"><button type="button" class="link-btn" data-tp="clear">${esc(tr('Clear'))}</button><button type="button" class="link-btn" data-tp="now">${esc(tr('Now'))}</button><button type="button" class="btn small" data-tp="ok">${esc(tr('Done'))}</button></div>`;
    document.body.appendChild(tpEl);
    const r = input.getBoundingClientRect(), w = tpEl.offsetWidth, h = tpEl.offsetHeight;
    const top = r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : Math.min(r.bottom + 6, Math.max(8, window.innerHeight - h - 8));
    tpEl.style.top = top + 'px';
    tpEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    tpEl.querySelectorAll('.tp-col').forEach(c => { const on = c.querySelector('.on'); if (on) c.scrollTop = on.offsetTop - c.clientHeight / 2 + on.offsetHeight / 2; });
    const apply = () => { input.value = st.h == null && st.m == null ? '' : p2(st.h == null ? 0 : st.h) + ':' + p2(st.m == null ? 0 : st.m); };
    tpEl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.v != null) {
        const k = b.parentNode.dataset.k;
        st[k] = +b.dataset.v;
        if (st.h == null) st.h = 0;
        if (st.m == null) st.m = 0;
        tpEl.querySelectorAll('.tp-col').forEach(c => c.querySelectorAll('button').forEach(x => x.classList.toggle('on', st[c.dataset.k] === +x.dataset.v)));
        apply();
        if (k === 'h') { const mc = tpEl.querySelector('[data-k="m"] .on'); if (mc) mc.scrollIntoView({ block: 'nearest' }); }
      } else if (b.dataset.tp === 'clear') { st.h = st.m = null; input.value = ''; closeTimePicker(); }
      else if (b.dataset.tp === 'now') { const d = new Date(); st.h = d.getHours(); st.m = d.getMinutes(); apply(); closeTimePicker(); }
      else if (b.dataset.tp === 'ok') closeTimePicker();
    });
  }
  const isTimeBox = el => el && el.matches && el.matches('#sch-form [name="time"], #sch-edit [name="time"]');
  document.addEventListener('focusin', e => { if (isTimeBox(e.target)) openTimePicker(e.target); });
  document.addEventListener('click', e => { if (isTimeBox(e.target)) openTimePicker(e.target); });
  document.addEventListener('pointerdown', e => { if (tpEl && !tpEl.contains(e.target) && e.target !== tpInput) closeTimePicker(); });
  document.addEventListener('keydown', e => { if (tpEl && (e.key === 'Escape' || e.key === 'Tab')) closeTimePicker(e.key === 'Tab'); });
  window.addEventListener('resize', () => closeTimePicker(true));

  // Edit a schedule item: change the title, date, time or how it repeats.
  function openSchEdit(id) {
    const x = db.schedule.find(v => v.id === id);
    if (!x) return;
    openModal(tr('Edit schedule item'), `
      <form id="sch-edit" autocomplete="off">
        ${fInput(esc(tr('Title')), 'title', 'text', x.title, 'maxlength="80" required')}
        <div class="row2">
          ${fInput(esc(tr('Date')), 'date', 'date', x.date, 'required')}
          ${fInput(esc(tr('Time')), 'time', 'text', x.time || '', 'inputmode="none" autocomplete="off" maxlength="5" placeholder="HH:MM"')}
        </div>
        <div class="field"><span>${esc(tr('Repeat'))}</span>${repPick(x.repeat || '')}</div>
        <button type="submit" class="btn primary block">${esc(tr('Save'))}</button>
      </form>`, root => {
      $('#sch-edit', root).addEventListener('submit', ev => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        const title = String(f.title || '').trim().slice(0, 80);
        if (!title) return;
        if (looksSensitive(title)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
        const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : x.date;
        const repeat = ['daily', 'weekly', 'monthly'].includes(f.repeat) ? f.repeat : '';
        const time = normTime(f.time);
        if (commit(() => {
          const t = db.schedule.find(v => v.id === id);
          if (!t.repeat && repeat) { t.doneDates = t.done ? [t.date] : []; t.done = false; }
          else if (t.repeat && !repeat) { t.done = (t.doneDates || []).includes(date); t.doneDates = []; }
          Object.assign(t, { title, date, time, repeat });
        })) { const back = ui.dayModal; closeModal(); renderHome(); if (back) openDayModal(back); toast(tr('Saved')); }
      });
    });
  }

  document.addEventListener('submit', e => {
    if (e.target.id !== 'sch-form') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const title = String(f.title || '').trim().slice(0, 80);
    if (!title) return;
    if (looksSensitive(title)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
    const date = e.target.dataset.date || todayISO();
    const repeat = ['daily', 'weekly', 'monthly'].includes(f.repeat) ? f.repeat : '';
    let time = '';
    { const dg = String(f.time || '').replace(/\D/g, '');
      if (dg.length === 4 || dg.length === 2) { const hh = dg.slice(0, 2), mm = dg.length === 4 ? dg.slice(2) : '00'; if (+hh < 24 && +mm < 60) time = hh + ':' + mm; } }
    if (commit(() => { db.schedule.push({ id: uid(), date, time, title, done: false, repeat, doneDates: [], createdAt: new Date().toISOString() }); })) {
      if (ui.dayEdit) ui.dayEdit.sch = false;
      renderHome();
      refreshDayModal();
      toast(tr('Schedule added'));
      try { if (matchMedia('(hover: hover)').matches) { const a = $('#sch-form [name="title"]'); if (a) a.focus(); } } catch (x) { /* ignore */ }
    }
  });

  // Diary date box: load the entry of the chosen day so it can be changed.
  document.addEventListener('change', e => {
    const el = e.target;
    if (!el.matches || !el.matches('#journal-form [name="date"]')) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value) || el.value > todayISO()) { el.value = ui.jDate || todayISO(); return; }
    if (ui.jEdit) return; // editing an entry: the new date is applied when Save is pressed
    ui.jDate = el.value === todayISO() ? null : el.value;
    renderDaily();
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (!el.matches || !el.matches('.exp-q')) return;
    const q = el.value.trim().toLowerCase();
    document.querySelectorAll('#exp-modal .exp-row').forEach(r => { r.hidden = !!q && !r.textContent.toLowerCase().includes(q); });
  });

  document.addEventListener('submit', e => {
    const qa = e.target.id === 'qa-exp';
    if (e.target.id !== 'exp-form' && !qa) return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const amount = Math.round(Number(f.amount) * 100) / 100;
    if (!(amount > 0) || amount > 99999999) { toast(tr('Enter an amount above 0')); return; }
    const note = String(f.note || '').trim().slice(0, 60);
    if (looksSensitive(note)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : todayISO();
    const cat = expCats().some(c => c.k === f.cat) ? f.cat : 'other';
    ui.lastCat = cat;
    const rid = f.rep ? uid() : '';
    if (commit(() => {
      if (rid) db.budget = { ...db.budget, recurring: [...(db.budget.recurring || []), { id: rid, amount, note, cat, day: Number(date.slice(8)), start: monthOf(date) }], updatedAt: new Date().toISOString() };
      db.expenses.push({ id: rid ? `rx-${rid}-${monthOf(date)}` : uid(), date, amount, note, cat, ...(rid ? { rec: 1 } : {}), createdAt: new Date().toISOString() });
    })) {
      if (qa) closeModal();
      refreshSpending();
      toast(tr('Added {amount}', { amount: money(amount) }));
      try { if (!qa && matchMedia('(hover: hover)').matches) { const a = $('#exp-form [name="amount"]'); if (a) a.focus(); } } catch (x) { /* ignore */ }
    }
  });




  function renderBudget() {
    const el = $('#budget');
    if (el) el.innerHTML = `<section class="panel p-bd"><h3>${esc(tr('Daily spending & budget'))}</h3>${budgetHtml(8)}</section>`;
  }
  const refreshSpending = () => { renderBudget(); renderHome(); };



  function openSpendQuick() {
    openModal('Log spending', expFormHtml('qa-exp', todayISO()), () => focusIn('#qa-exp [name="amount"]'));
  }
  /* ------------------------------------------------------------------ */
  /* Home "What needs doing today": bills, schedule, to-dos, habits, checks */
  /* ------------------------------------------------------------------ */
  function todayRows(skipDay) {
    const t = todayISO(), rows = [];
    db.renewals.filter(r => r.status === 'active' && r.nextDueDate).forEach(r => {
      const d = daysUntil(r.nextDueDate);
      if (d <= Number(r.remindDaysBefore || 0)) rows.push({ o: d, html: `
        <button type="button" class="td-row td-go" data-action="tab" data-tab="renewals">
          <span class="td-ic">${IC('bell')}</span>
          <span class="td-main"><b>${esc(r.title)}</b><small>${esc(tr('Bill'))}</small></span>
          <span class="badge ${urgency(d)}">${esc(daysText(d))}</span>
        </button>` });
    });
    rows.sort((a, b) => a.o - b.o);
    const out = rows.map(r => r.html);
    // Unfinished one-off items without a time stay on the list for 30 days, the way the old to-do list did.
    const from = addDays(t, -30);
    db.schedule.filter(x => !x.repeat && !x.done && !x.time && x.date < t && x.date >= from).sort((p, q) => p.date.localeCompare(q.date)).forEach(x => out.push(`
        <div class="td-row">
          <button type="button" class="sch-check" data-action="sch-toggle" data-id="${esc(x.id)}" data-date="${esc(x.date)}" role="checkbox" aria-checked="false" aria-label="${esc(tr('Mark as done'))}"></button>
          <span class="td-main"><b>${esc(x.title)}</b><small>${esc(tr('Overdue'))} &middot; ${esc(fmtDate(x.date))}</small></span>
        </div>`));
    if (!skipDay) schOn(t).filter(x => !schDone(x, t)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')).forEach(x => out.push(`
        <div class="td-row">
          <button type="button" class="sch-check" data-action="sch-toggle" data-id="${esc(x.id)}" data-date="${t}" role="checkbox" aria-checked="false" aria-label="${esc(tr('Mark as done'))}"></button>
          <span class="td-main"><b>${esc(x.title)}</b><small>${esc(x.time || tr('Schedule'))}</small></span>
        </div>`));
    db.todos.filter(x => !x.done).forEach(x => out.push(`
        <div class="td-row">
          <button type="button" class="sch-check" data-action="td-toggle" data-id="${esc(x.id)}" role="checkbox" aria-checked="false" aria-label="${esc(tr('Mark as done'))}"></button>
          <span class="td-main"><b>${esc(x.title)}</b><small>${esc(tr('To-do'))}</small></span>
        </div>`));
    if (!skipDay) activeHabits().filter(h => habitSched(h, t) && !habitDone(h, t)).forEach(h => out.push(`
        <div class="td-row">
          <button type="button" class="sch-check" data-action="hb-toggle" data-id="${esc(h.id)}" role="checkbox" aria-checked="false" aria-label="${esc(h.name)}"></button>
          <span class="td-main"><b>${esc(h.name)}</b><small>${esc(tr('Habit'))}</small></span>
        </div>`));
    return out;
  }

  function todayPanelHtml() {
    const rows = todayRows(), MAX = 8;
    return `<section class="panel p-today">
      <div class="td-head"><h3>${esc(tr('What needs doing today'))}</h3>${rows.length ? `<span class="badge gray">${esc(tr('{n} to go', { n: rows.length }))}</span>` : ''}</div>
      ${rows.length ? `<div class="td-list">${rows.slice(0, MAX).join('')}</div>
        ${rows.length > MAX ? `<button type="button" class="link-btn" data-action="day-open" data-date="${t}">${esc(tr('And {n} more', { n: rows.length - MAX }))}</button>` : ''}`
        : `<p class="panel-note">${esc(tr('All clear. Nothing needs you right now.'))}</p>`}
    </section>`;
  }

  function renderHome() {
    if (!ui.calMonth) ui.calMonth = todayISO().slice(0, 8) + '01';
    if (!ui.calInit) { ui.calInit = true; ui.calSel = todayISO(); }
    $('#home').innerHTML = `
      ${sampleBarHtml()}
      ${startCardHtml()}
      <div class="home-cols">
        <div class="home-col">
          <section class="panel p-tl"><h3>${esc(tr('Next 12 months'))}</h3>${timelineHtml()}</section>
          <section class="panel p-sp"><h3>${esc(tr('Spending, next 12 months'))}</h3>${spendHtml()}</section>
        </div>
        <div class="home-col">
          <section class="panel p-cal"><h3>${esc(tr('Calendar'))}</h3>${calendarHtml()}</section>
        </div>
      </div>
      <div id="daily">${activeHabits().length ? `<div class="daily-grid daily-low">${habitReportHtml()}</div>` : ''}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Tab 1: Assets                                                       */
  /* ------------------------------------------------------------------ */
  function warrantyBadge(a) {
    if (!a.warrantyExpiry) return `<span class="badge gray">${esc(tr('No warranty'))}</span>`;
    const d = daysUntil(a.warrantyExpiry);
    if (d < 0) return `<span class="badge red">${esc(tr('Expired {n}d ago', { n: -d }))}</span>`;
    if (d <= 30) return `<span class="badge yellow">${esc(tr('Expiring · {n}d', { n: d }))}</span>`;
    return `<span class="badge green">${esc(tr('In warranty · {n}d', { n: d }))}</span>`;
  }

  function warrantyRing(a) {
    if (!a.warrantyExpiry) return '';
    const d = daysUntil(a.warrantyExpiry);
    const tot = a.purchaseDate ? Math.max(1, Math.round((parseISO(a.warrantyExpiry) - parseISO(a.purchaseDate)) / DAY_MS)) : Math.max(365, d);
    return window.SHI.ring(d < 0 ? 100 : d / tot * 100, d < 0 ? 'over' : d <= 30 ? 'warn' : '', d < 0 ? '!' : d > 999 ? Math.floor(d / 365) + 'y' : d + 'd', 46);
  }

  function assetCard(a) {
    const open = ui.expanded.has(a.id);
    const history = (a.maintenanceHistory || []).slice(0, 5);
    const maintDays = a.nextMaintenanceDate ? daysUntil(a.nextMaintenanceDate) : null;
    const hasMaint = a.maintenanceCycleMonths || a.nextMaintenanceDate || a.lastMaintenanceDate || history.length;

    return `
      <article class="card ${open ? 'open' : ''}" data-id="${esc(a.id)}" data-rid="${esc(a.id)}">
        <div class="card-row tap" data-action="toggle-asset" data-id="${esc(a.id)}">
          <div class="card-main">
            <div class="card-title">${esc(a.name)}</div>
            <div class="tags">
              ${a.locationText ? `<span class="tag loc">${IC('pin')} ${esc(a.locationText)}</span>` : `<span class="tag">${esc(tr('No location'))}</span>`}
              ${maintDays !== null ? `<span class="tag ${maintDays <= 30 ? 'warn' : ''}">${IC('wrench')} ${esc(tr('Service'))} ${esc(daysText(maintDays))}</span>` : ''}
            </div>
          </div>
          <div class="card-side with-chev">${warrantyRing(a)}${warrantyBadge(a)}<span class="chev" aria-hidden="true"></span></div>
        </div>
        <div class="detail">
          <div class="kv"><span>${esc(tr('Category'))}</span><b>${esc(a.category || '-')}</b></div>
          <div class="kv"><span>${esc(tr('Purchased'))}</span><b>${esc(fmtDate(a.purchaseDate))}</b></div>
          <div class="kv"><span>${esc(tr('Price'))}</span><b>${a.price !== '' && a.price != null ? esc(money(a.price)) : '-'}</b></div>
          <div class="kv"><span>${esc(tr('Warranty until'))}</span><b>${esc(fmtDate(a.warrantyExpiry))}</b></div>
          ${hasMaint ? `
            <h4>${esc(tr('Maintenance'))}</h4>
            <div class="kv"><span>${esc(tr('Cycle'))}</span><b>${a.maintenanceCycleMonths ? esc(tr('Every {n} month(s)', { n: a.maintenanceCycleMonths })) : '-'}</b></div>
            <div class="kv"><span>${esc(tr('Last service'))}</span><b>${esc(fmtDate(a.lastMaintenanceDate))}</b></div>
            <div class="kv"><span>${esc(tr('Next service'))}</span><b>${esc(fmtDate(a.nextMaintenanceDate))}</b></div>
            ${a.maintenanceNote ? `<div class="kv"><span>${esc(tr('Note'))}</span><b>${esc(a.maintenanceNote)}</b></div>` : ''}
            ${history.length ? `<h4>${esc(tr('History'))}</h4><ul class="history">${history.map(h =>
              `<li>${esc(fmtDate(h.date))}${h.note ? ' - ' + esc(h.note) : ''}</li>`).join('')}</ul>` : ''}
          ` : ''}
          <div class="card-actions">
            <button class="btn small" data-action="log-maint" data-id="${esc(a.id)}">${esc(tr('Log maintenance'))}</button>
            <button class="btn small ghost" data-action="edit-asset" data-id="${esc(a.id)}">${esc(tr('Edit'))}</button>
            <button class="btn small danger" data-action="del-asset" data-id="${esc(a.id)}">${esc(tr('Delete'))}</button>
          </div>
        </div>
      </article>`;
  }

  const ASSET_FILTERS = [['all', 'All'], ['warranty', 'Warranty ending'], ['service', 'Service due'], ['expired', 'Expired']];
  const assetFlag = (a, f) => {
    const w = a.warrantyExpiry ? daysUntil(a.warrantyExpiry) : null;
    if (f === 'warranty') return w !== null && w >= 0 && w <= 30;
    if (f === 'service') return !!a.nextMaintenanceDate && daysUntil(a.nextMaintenanceDate) <= 30;
    if (f === 'expired') return w !== null && w < 0;
    return true;
  };

  function renderAssets() {
    $('#asset-stats').innerHTML = ''; // the header already shows the count and total value
    $('#asset-filters').innerHTML = !db.assets.length ? '' : ASSET_FILTERS.map(([k, l]) => {
      const n = db.assets.filter(a => assetFlag(a, k)).length;
      return `<button class="chip-btn ${ui.assetFilter === k ? 'active' : ''}" data-action="asset-filter" data-f="${k}">${esc(tr(l))}${k !== 'all' ? ` (${n})` : ''}</button>`;
    }).join('');
    $('#asset-cats').innerHTML = ['All', ...catNames()].map(c =>
      `<button class="chip-btn ${ui.assetCat === c ? 'active' : ''}" data-action="asset-cat" data-cat="${esc(c)}">${esc(tr(c))}</button>`).join('');

    const tokens = ui.assetQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const items = db.assets
      .filter(a => ui.assetCat === 'All' || a.category === ui.assetCat)
      .filter(a => assetFlag(a, ui.assetFilter))
      .filter(a => {
        const hay = `${a.name || ''} ${a.locationText || ''}`.toLowerCase();
        return tokens.every(t => hay.includes(t));
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    $('#asset-list').innerHTML = items.length
      ? items.map(assetCard).join('')
      : (db.assets.length
        ? `<div class="empty">${bi('No items match your search.')}</div>`
        : emptyCard({
          ico: '&#128230;',
          en: 'No items yet',
          egEn: 'Example: "Passport", kept in the top drawer, or a camera with its warranty date.'
        }));
  }

  /* ------------------------------------------------------------------ */
  /* Step-by-step wizard (shared by all three forms)                     */
  /* ------------------------------------------------------------------ */

  // Big tappable choice buttons. Clicking one stores data[name] and re-renders the step.
  function tiles(name, options, selected, cols) {
    return `<div class="tiles ${cols === 3 ? 'three' : ''}">${options.map(o => `
      <button type="button" class="tile ${String(o.v) === String(selected) ? 'sel' : ''}" data-choice="${name}" data-value="${esc(o.v)}">
        ${o.i ? `<span class="ti">${o.i}</span>` : ''}
        <span class="tl">${esc(tr(o.l))}</span>
        ${o.s ? `<small>${esc(tr(o.s))}</small>` : ''}
        ${o.del ? `<span class="tile-x" role="button" aria-label="Remove ${esc(o.l)}" title="Remove" data-wz-act="${esc(o.del)}" data-value="${esc(o.v)}">&times;</span>` : ''}
      </button>`).join('')}</div>`;
  }

  // Copy every named input in the current step into the wizard data object.
  function collectFields(root, data) {
    $$('input[name], select[name], textarea[name]', root).forEach(el => {
      data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
  }

  /* cfg = {
   *   title, data, editing, finishLabel,
   *   getSteps(data)        -> array of steps, recomputed after every answer
   *   finish(data)          -> called on the last step
   *   extraLast(data)       -> optional html shown above the buttons on the last step
   *   onChoice(name, value, oldValue, data)
   * }
   * step = { id, title, sub, optional, render(data), validate(data, wz), mount(body, data, wz, refresh) }
   */
  function openWizard(cfg) {
    const data = cfg.data;
    const wz = { idx: 0 };

    const html = `
      <div class="wz">
        <div id="wz-prog"></div>
        <div id="wz-head"></div>
        <form id="wz-body" class="wz-body" autocomplete="off" novalidate></form>
        <div id="wz-extra"></div>
        <div class="wz-foot">
          <div id="wz-note" class="wz-note"></div>
          <div class="wz-btns">
            <button type="button" class="btn ghost" id="wz-back"></button>
            <button type="button" class="btn primary" id="wz-next"></button>
          </div>
        </div>
      </div>`;

    openModal(cfg.title, html, root => {
      // Do not close a half-filled wizard by tapping the dark area.
      $('.modal-backdrop', root).dataset.lock = '1';

      const wzEl = $('.wz', root);
      const body = $('#wz-body', wzEl);
      const nextBtn = $('#wz-next', wzEl);
      const backBtn = $('#wz-back', wzEl);
      const sheet = $('.sheet', root);

      function view() {
        const list = cfg.getSteps(data);
        if (wz.idx > list.length - 1) wz.idx = list.length - 1;
        return { list, step: list[wz.idx] };
      }

      function refreshNext() {
        const { step } = view();
        collectFields(body, data);
        const err = step.validate ? step.validate(data, wz) : '';
        nextBtn.disabled = !!err;
        $('#wz-note', wzEl).textContent = tr(err || (step.optional ? 'Optional. You can continue without filling this in.' : ''));
      }

      function render(keepScroll) {
        const { list, step } = view();
        const last = wz.idx === list.length - 1;
        const scrollTop = sheet.scrollTop;

        $('#wz-prog', wzEl).innerHTML = `
          <div class="wz-segs">${list.map((s, i) =>
            `<button type="button" class="wz-seg ${i < wz.idx ? 'done' : ''} ${i === wz.idx ? 'cur' : ''}" data-wz-go="${i}" aria-label="${esc(tr('Step {a} of {b}', { a: i + 1, b: list.length }))}"></button>`).join('')}</div>
          <div class="wz-count">${esc(tr('Step {a} of {b}', { a: wz.idx + 1, b: list.length }))}</div>`;
        $('#wz-head', wzEl).innerHTML = `<h3 class="wz-title">${esc(tr(step.title))}</h3>${step.sub ? `<p class="wz-sub">${esc(tr(step.sub))}</p>` : ''}`;

        body.innerHTML = step.render(data);
        if (step.mount) step.mount(body, data, wz, refreshNext);

        backBtn.textContent = tr(wz.idx === 0 ? 'Cancel' : 'Back');
        nextBtn.textContent = tr(last ? (cfg.finishLabel || 'Save') : 'Next');
        $('#wz-extra', wzEl).innerHTML = last && cfg.extraLast ? cfg.extraLast(data) : '';

        // Focus the first text field, unless the step starts with choice buttons.
        if (!body.querySelector('.tile')) {
          const f = body.querySelector('input[type="text"], input[type="tel"], input[type="number"], textarea');
          if (f && !f.value) f.focus();
        }
        refreshNext();
        sheet.scrollTop = keepScroll ? scrollTop : 0;
      }

      // Save what is on screen before leaving a step.
      function leave() {
        collectFields(body, data);
      }

      function next() {
        const { list, step } = view();
        leave();
        const err = step.validate ? step.validate(data, wz) : '';
        if (err) { toast(tr(err)); return; }
        if (wz.idx < list.length - 1) { wz.idx++; render(); return; }

        // Last step: make sure every earlier step is still valid before saving.
        for (let i = 0; i < list.length; i++) {
          const e = list[i].validate ? list[i].validate(data, wz) : '';
          if (e) { wz.idx = i; render(); toast(tr(e)); return; }
        }
        cfg.finish(data);
      }

      nextBtn.addEventListener('click', next);
      backBtn.addEventListener('click', () => {
        if (wz.idx === 0) { closeModal(); return; }
        leave();
        wz.idx--;
        render();
      });

      body.addEventListener('input', refreshNext);
      body.addEventListener('change', refreshNext);
      body.addEventListener('submit', e => e.preventDefault());
      body.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (!nextBtn.disabled) next();
        }
      });

      wzEl.addEventListener('click', e => {
        // Progress segments: always go back freely, go forward only when editing.
        const seg = e.target.closest('[data-wz-go]');
        if (seg) {
          const to = Number(seg.dataset.wzGo);
          if (to === wz.idx) return;
          const { step } = view();
          leave();
          if (to > wz.idx) {
            if (!cfg.editing) { toast(tr('Use Next to continue')); return; }
            const err = step.validate ? step.validate(data, wz) : '';
            if (err) { toast(tr(err)); return; }
          }
          wz.idx = to;
          render();
          return;
        }
        // Small action buttons inside tiles (remove a category or template made by the user)
        const act = e.target.closest('[data-wz-act]');
        if (act) {
          e.stopPropagation();
          collectFields(body, data);
          if (cfg.onAction) Promise.resolve(cfg.onAction(act.dataset.wzAct, act.dataset.value, data)).then(() => render(true));
          return;
        }
        // Choice tiles
        const tile = e.target.closest('[data-choice]');
        if (tile) {
          collectFields(body, data);
          const name = tile.dataset.choice;
          const old = data[name];
          data[name] = tile.dataset.value;
          if (cfg.onChoice) cfg.onChoice(name, data[name], old, data);
          render(true);
          return;
        }
        // Suggestion chips that fill a text field
        const fill = e.target.closest('[data-fill]');
        if (fill) {
          const inp = body.querySelector(`input[name="${fill.dataset.fill}"]`);
          if (inp) { inp.value = fill.dataset.value; refreshNext(); }
        }
      });

      render();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Asset wizard: the steps depend on the category                      */
  /* ------------------------------------------------------------------ */
  const ASSET_CATS = [
    { v: 'Electronics', l: 'Electronics', s: 'Phone, laptop, camera', i: IC('phone') },
    { v: 'Appliances', l: 'Appliances', s: 'Aircon, fridge, water filter', i: IC('plug') },
    { v: 'Vehicle', l: 'Vehicle', s: 'Car, motorbike', i: IC('car') },
    { v: 'Office Equipment', l: 'Office Equipment', s: 'Printer, tools, furniture', i: IC('briefcase') }
  ];

  const OTHER_TILE = { v: 'Other', l: 'Other', s: 'Anything else', i: IC('box') };

  // Every category can be removed by the user, built-in ones too (they are only hidden, and can be restored).
  function assetCatOptions(selected) {
    const hidden = db.custom.hiddenCats;
    // An item can still use a category the user removed later: keep it selectable while editing.
    const keep = o => !hidden.includes(o.v) || o.v === selected;
    const opts = ASSET_CATS.filter(keep).map(c => ({ ...c, del: 'del-cat' }));
    db.custom.assetCats.forEach(c => opts.push({ v: c, l: c, s: 'My category', i: IC('tag'), del: 'del-cat' }));
    if (keep(OTHER_TILE)) opts.push({ ...OTHER_TILE, del: 'del-cat' });
    if (selected && selected !== NEW_CAT && !opts.some(o => o.v === selected)) {
      opts.push({ v: selected, l: selected, s: 'My category', i: IC('tag') });
    }
    opts.push({ v: NEW_CAT, l: 'Add my own', s: 'Make a new category', i: IC('plus') });
    return opts;
  }

  const NAME_HINT = {
    'Electronics': 'e.g. MacBook Air, Canon camera',
    'Appliances': 'e.g. Living room aircon, Water filter',
    'Vehicle': 'e.g. Toyota Vios WXX 1234',
    'Office Equipment': 'e.g. Label printer, Drill set'
  };

  const YES_NO_WARRANTY = [
    { v: 'yes', l: 'Yes', s: 'It has a warranty', i: IC('check') },
    { v: 'no', l: 'No warranty', s: 'Skip this part', i: IC('ban') }
  ];
  const YES_NO_SERVICE = [
    { v: 'yes', l: 'Yes', s: 'Remind me to service it', i: IC('wrench') },
    { v: 'no', l: 'No', s: 'No regular servicing', i: IC('ban') }
  ];
  const CYCLE_MONTH_TILES = [
    { v: 3, l: 'Every 3 months' },
    { v: 6, l: 'Every 6 months' },
    { v: 12, l: 'Every 12 months' }
  ];

  function assetSteps(d) {
    const cat = d.category;

    const what = {
      id: 'what',
      title: 'What are you adding?',
      sub: 'Pick a category first. The next steps match it.',
      render: x => tiles('category', assetCatOptions(x.category), x.category)
        + (db.custom.hiddenCats.length ? '<button type="button" class="link-btn" data-wz-act="restore-cats">' + esc(tr('Restore removed categories')) + '</button>' : '')
        + (x.category === NEW_CAT ? fInput('Category name *', 'newCategory', 'text', x.newCategory, 'maxlength="30" placeholder="' + esc(tr('e.g. Sports gear, Musical instruments')) + '"') : '')
        + (x.category
          ? fInput(x.category === 'Vehicle' ? 'Vehicle name / plate no. *' : 'Item name *', 'name', 'text', x.name, `placeholder="${esc(tr(NAME_HINT[x.category] || 'e.g. Bicycle, Guitar'))}"`) + safeNote()
          : ''),
      mount: (body, x) => {
        const f = body.querySelector('input[name="newCategory"]');
        if (f && !f.value) f.focus();
      },
      validate: x => !x.category ? 'Pick a category to continue'
        : (x.category === NEW_CAT && !(x.newCategory || '').trim()) ? 'Enter a name for your category'
        : !(x.name || '').trim() ? 'Enter a name to continue'
        : sensitiveErr(x, ['name', 'newCategory'])
    };

    const purchase = {
      id: 'purchase',
      optional: true,
      title: 'When did you buy it?',
      sub: 'Date and price help with warranty and insurance claims.',
      render: x => `<div class="row2">
        ${fInput('Purchase date', 'purchaseDate', 'date', x.purchaseDate)}
        ${fInput('Price', 'price', 'number', x.price, 'step="0.01" min="0" inputmode="decimal"')}
      </div>`
    };

    const locText = {
      'Vehicle': { title: 'Spare key & papers', sub: 'Where do you keep the spare key and the car papers?', ph: 'e.g. Bedroom drawer, blue folder' }
    }[cat] || { title: 'Where did you put it?', sub: 'So you never have to search for it again.', ph: 'e.g. Living room TV cabinet, 2nd shelf' };

    const location = {
      id: 'location',
      optional: true,
      title: locText.title,
      sub: locText.sub,
      render: x => fInput('Storage location', 'locationText', 'text', x.locationText, `placeholder="${esc(tr(locText.ph))}"`) + safeNote(),
      validate: x => sensitiveErr(x, ['locationText'])
    };

    const warranty = {
      id: 'warranty',
      title: 'Does it have a warranty?',
      sub: 'We will count the days left and warn you before it ends.',
      render: x => tiles('hasWarranty', YES_NO_WARRANTY, x.hasWarranty)
        + (x.hasWarranty === 'yes' ? fInput('Warranty ends on *', 'warrantyExpiry', 'date', x.warrantyExpiry) : ''),
      validate: x => !x.hasWarranty ? 'Choose an option to continue'
        : (x.hasWarranty === 'yes' && !x.warrantyExpiry) ? 'Pick the warranty end date to continue' : ''
    };

    const serviceSub = cat === 'Vehicle' ? 'Regular servicing keeps the car safe and the warranty valid.'
      : cat === 'Appliances' ? 'Aircon, water filters and similar items need regular servicing.'
      : 'Does it need regular servicing or part replacement?';

    const service = {
      id: 'service',
      title: 'Does it need regular servicing?',
      sub: serviceSub,
      render: x => tiles('needsService', YES_NO_SERVICE, x.needsService)
        + (x.needsService === 'yes'
          ? `<div class="field"><span>${esc(tr('How often? *'))}</span></div>`
            + tiles('maintenanceCycleMonths', CYCLE_MONTH_TILES, x.maintenanceCycleMonths, 3)
            + fInput('Or type a number of months', 'maintenanceCycleMonths', 'number', x.maintenanceCycleMonths, 'min="1" step="1" inputmode="numeric"')
            + fInput('Last serviced on (optional)', 'lastMaintenanceDate', 'date', x.lastMaintenanceDate)
            + fText('Note (optional)', 'maintenanceNote', x.maintenanceNote, 2)
          : ''),
      validate: x => !x.needsService ? 'Choose an option to continue'
        : (x.needsService === 'yes' && !(Number(x.maintenanceCycleMonths) > 0)) ? 'Choose how often it needs servicing'
        : sensitiveErr(x, ['maintenanceNote'])
    };

    if (cat === 'Vehicle') return [what, purchase, warranty, service, location];
    return [what, purchase, location, warranty, service];
  }

  function openAssetForm(id) {
    const a = id ? db.assets.find(x => x.id === id) : {};
    if (!a) return;
    const data = { ...a };
    if (id) {
      data.hasWarranty = a.warrantyExpiry ? 'yes' : 'no';
      data.needsService = (a.maintenanceCycleMonths || a.nextMaintenanceDate) ? 'yes' : 'no';
    }

    openWizard({
      title: id ? 'Edit Item' : 'New Item',
      data,
      editing: !!id,
      finishLabel: id ? 'Save changes' : 'Save item',
      getSteps: assetSteps,
      onAction: async (act, value, d) => {
        if (act === 'restore-cats') {
          commit(() => { db.custom.hiddenCats = []; });
          renderAll();
          return;
        }
        if (act !== 'del-cat') return;
        const ok = await confirmDialog({
          title: tr('Remove "{v}"?', { v: value }),
          message: 'Items already using this category keep it. It will no longer show as a choice for new items.',
          confirmLabel: 'Remove'
        });
        if (!ok) return;
        commit(() => {
          if (db.custom.assetCats.includes(value)) db.custom.assetCats = db.custom.assetCats.filter(c => c !== value);
          else if (!db.custom.hiddenCats.includes(value)) db.custom.hiddenCats.push(value);
        });
        if (d.category === value) d.category = '';
        renderAll();
      },
      extraLast: () => id ? `<button type="button" class="btn danger block wz-delete" data-action="del-asset" data-id="${esc(id)}">${esc(tr('Delete this item'))}</button>` : '',
      finish: d => {
        const cycle = d.needsService === 'yes' ? (Number(d.maintenanceCycleMonths) || '') : '';
        let next = '';
        if (cycle) {
          if (d.lastMaintenanceDate) next = addMonths(d.lastMaintenanceDate, cycle);
          else next = d.nextMaintenanceDate || addMonths(todayISO(), cycle);
        }
        let category = d.category;
        let newCat = '';
        if (category === NEW_CAT) {
          category = (d.newCategory || '').trim();
          const hit = catNames().find(c => c.toLowerCase() === category.toLowerCase());
          if (hit) category = hit; else newCat = category;
        }
        const rec = {
          id: a.id || uid(),
          name: d.name.trim(),
          category,
          purchaseDate: d.purchaseDate || '',
          price: (d.price === '' || d.price == null) ? '' : Number(d.price),
          warrantyExpiry: d.hasWarranty === 'yes' ? (d.warrantyExpiry || '') : '',
          locationText: (d.locationText || '').trim(),
          maintenanceCycleMonths: cycle,
          lastMaintenanceDate: cycle ? (d.lastMaintenanceDate || '') : '',
          nextMaintenanceDate: next,
          maintenanceNote: cycle ? (d.maintenanceNote || '').trim() : '',
          createdAt: a.createdAt || new Date().toISOString()
        };
        if (commit(() => { if (newCat) db.custom.assetCats.push(newCat); upsert(db.assets, rec); })) {
          closeModal();
          renderAll();
          toast(id ? 'Item updated' : 'Item added');
        }
      }
    });
  }

  function openMaintForm(id) {
    const a = db.assets.find(x => x.id === id);
    if (!a) return;
    const html = `
      <form id="maint-form">
        ${fInput('Service date', 'date', 'date', todayISO(), 'required')}
        ${fText('Note', 'note', '', 2, `placeholder="${esc(tr('What was done?'))}"`)}
        <p class="card-sub">${a.maintenanceCycleMonths
          ? esc(tr('The next service date will be set {n} month(s) after this date.', { n: a.maintenanceCycleMonths }))
          : esc(tr('No cycle is set, so the next service date will be cleared.'))}</p>
        <button type="submit" class="btn primary block">${esc(tr('Save record'))}</button>
      </form>`;
    openModal(tr('Log maintenance') + ' - ' + a.name, html, root => {
      $('#maint-form', root).addEventListener('submit', ev => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        if (commit(() => {
          const t = db.assets.find(x => x.id === id);
          t.maintenanceHistory = [{ date: f.date, note: (f.note || '').trim() }, ...(t.maintenanceHistory || [])];
          t.lastMaintenanceDate = f.date;
          t.nextMaintenanceDate = t.maintenanceCycleMonths ? addMonths(f.date, Number(t.maintenanceCycleMonths)) : '';
        })) {
          closeModal();
          renderAll();
          toast('Maintenance logged');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tab 2: Renewals                                                     */
  /* ------------------------------------------------------------------ */
  function renewCard(r) {
    const active = r.status === 'active';
    const d = r.nextDueDate ? daysUntil(r.nextDueDate) : null;
    const u = active && d !== null ? urgency(d) : '';
    const inWindow = active && d !== null && d <= Number(r.remindDaysBefore || 0);
    const doneLabel = tr(r.type === 'paylater' ? 'Paid' : r.cycle === 'onetime' ? 'Mark done' : 'Renewed');
    const stopLabel = tr(r.type === 'subscription' ? 'Cancelled' : 'Archive');

    return `
      <article class="card ${u} ${inWindow ? 'remind' : ''} ${active ? '' : 'archived'}" data-rid="${esc(r.id)}">
        <div class="card-row">
          <div class="card-main">
            <div class="card-title">${esc(r.title)}</div>
            <div class="card-sub">${r.amount ? esc(money(r.amount)) + ' &middot; ' : ''}${esc(CYCLE_LABEL[r.cycle] || '')} &middot; ${esc(fmtDate(r.nextDueDate))}</div>
            <div class="tags">
              ${r.isTrial ? `<span class="tag warn">${esc(tr('Free trial'))}</span>` : ''}
              ${r.type === 'paylater' && active ? `<span class="tag loc">${esc(tr('{n} left', { n: Number(r.left) || 0 }))}</span>` : ''}
              ${(r.history || []).length ? `<span class="tag">${esc(tr(r.type === 'paylater' ? 'Paid' : 'Renewed'))} ${(r.history || []).length}&times;</span>` : ''}
              ${inWindow ? `<span class="tag warn">${IC('clock')} ${esc(tr('Reminder window'))} (${esc(r.remindDaysBefore)}d)</span>` : ''}
            </div>
          </div>
          <div class="card-side">
            ${active
              ? (d !== null ? `<span class="badge ${u}">${esc(daysText(d))}</span>` : '')
              : `<span class="badge gray">${esc(tr('Archived'))}</span>`}
          </div>
        </div>
        <div class="card-actions">
          ${active ? `
            <button class="btn small ok" data-action="renew-done" data-id="${esc(r.id)}">${doneLabel}</button>
            <button class="btn small ghost" data-action="renew-stop" data-id="${esc(r.id)}">${stopLabel}</button>
          ` : `
            <button class="btn small ghost" data-action="renew-restore" data-id="${esc(r.id)}">${esc(tr('Restore'))}</button>
          `}
          ${(r.history || []).length ? `<button class="btn small ghost" data-action="renew-history" data-id="${esc(r.id)}">${esc(tr('History'))}</button>` : ''}
          ${active && r.nextDueDate ? `<button class="btn small ghost" data-action="add-ics" data-kind="renew" data-id="${esc(r.id)}">${esc(tr('Add to calendar'))}</button>` : ''}
          <button class="btn small ghost" data-action="edit-renew" data-id="${esc(r.id)}">${esc(tr('Edit'))}</button>
          <button class="btn small danger" data-action="del-renew" data-id="${esc(r.id)}">${esc(tr('Delete'))}</button>
        </div>
      </article>`;
  }

  function renderQuickAdd() {
    const have = new Set(db.renewals.map(r => (r.title || '').trim().toLowerCase()));
    const opts = QUICK_ADD.map((p, i) => ({ p, i }))
      .filter(x => x.p.type === ui.renewTab && !have.has(x.p.t.toLowerCase()));
    $('#quick-wrap').innerHTML = opts.length
      ? `<div class="quick-l">${esc(tr('Quick add: just pick a date'))}</div><div class="chip-row">${opts.map(x =>
          `<button type="button" class="chip-btn" data-action="quick-add" data-i="${x.i}">${x.p.i} ${esc(x.p.t)}</button>`).join('')}</div>`
      : '';
  }

  function openQuickAdd(p) {
    const isSub = p.type === 'subscription';
    const isPL = p.type === 'paylater';
    const dateLabel = isPL ? 'Next instalment date *' : isSub ? 'Next billing date *' : p.cycle === 'onetime' ? 'Expires on *' : 'Next renewal date *';
    const amtLabel = isPL ? `Amount per instalment (${CURRENCY}) *` : isSub ? `Amount per month (${CURRENCY}, optional)` : `Renewal cost (${CURRENCY}, optional)`;
    const html = `<form id="qa-form">
        ${fInput(dateLabel, 'nextDueDate', 'date', '', 'required')}
        ${p.cycle === 'onetime' ? '' : fInput(amtLabel, 'amount', 'number', '', isPL ? 'step="0.01" min="0.01" inputmode="decimal" required' : 'step="0.01" min="0" inputmode="decimal"')}
        ${isPL ? fInput('Instalments left *', 'left', 'number', '', 'min="1" max="120" step="1" inputmode="numeric" required') : ''}
        <p class="card-sub">${esc(tr('We will remind you {n} days before.', { n: p.remind }))}</p>
        <button type="submit" class="btn primary block">${esc(tr('Save'))}</button>
      </form>`;
    openModal(tr('Add {v}', { v: p.t }), html, root => {
      $('#qa-form', root).addEventListener('submit', ev => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        if (!f.nextDueDate) return;
        const rec = {
          id: uid(), title: p.t, type: p.type, amount: Number(f.amount) || 0, cycle: p.cycle,
          nextDueDate: f.nextDueDate, remindDaysBefore: p.remind, status: 'active', isTrial: false,
          ...(isPL ? { left: Math.max(1, Math.round(Number(f.left)) || 1) } : {}),
          createdAt: new Date().toISOString()
        };
        if (commit(() => { db.renewals.push(rec); })) {
          ui.renewTab = p.type;
          closeModal();
          renderAll();
          toast(tr('{v} added', { v: p.t }));
        }
      });
    });
  }

  function subAnalysisHtml() {
    const subs = activeSubscriptions().map(r => ({ r, y: monthlyEquivalent(r) * 12 })).filter(x => x.y > 0).sort((a, b) => b.y - a.y);
    const trials = db.renewals.filter(r => r.type === 'subscription' && r.status === 'active' && r.isTrial && r.nextDueDate && daysUntil(r.nextDueDate) >= 0 && daysUntil(r.nextDueDate) <= 7);
    if (!subs.length && !trials.length) return '';
    const tot = subs.reduce((t, x) => t + x.y, 0), top = subs.slice(0, 5), pal = window.SHI.pal;
    return `<section class="panel sub-ana"><h3>${esc(tr('Subscription insights'))}</h3><div class="pn-body">
      ${top.length ? `<div class="stack">${top.map((x, i) => `<i style="flex:${x.y};background:${pal[i]}"></i>`).join('')}</div>
      ${top.map((x, i) => `<div class="cat-row"><span class="cat-n"><i class="sw" style="background:${pal[i]}"></i>${esc(x.r.title)}</span><span class="cat-bar"><i style="width:${Math.max(3, Math.round(x.y / top[0].y * 100))}%"></i></span><span class="cat-v">${esc(money(x.y))} <small>${Math.round(x.y / tot * 100)}%</small></span></div>`).join('')}
      <p class="panel-note">${esc(tr('Biggest: {name}. Cancelling it saves {amount} a year.', { name: top[0].r.title, amount: money(top[0].y) }))}</p>` : ''}
      ${trials.map(r => `<p class="panel-note warn">${esc(tr('{name}: free trial ends in {n}d', { name: r.title, n: daysUntil(r.nextDueDate) }))}</p>`).join('')}
      </div></section>`;
  }

  function renderRenewals() {
    renderQuickAdd();
    $$('.subtab').forEach(b => b.classList.toggle('active', b.dataset.rtab === ui.renewTab));
    $('#show-archived').checked = ui.showArchived;

    const isSub = ui.renewTab === 'subscription';
    $('#renew-stats').innerHTML = ''; // these numbers are shown in the header cards
    try { if (ui.tab === 'renewals') renderHeader(); } catch (e) { /* ignore */ }

    let sa = $('#sub-ana');
    if (!sa) { sa = document.createElement('div'); sa.id = 'sub-ana'; $('#renew-stats').after(sa); }
    sa.innerHTML = isSub ? subAnalysisHtml() : '';

    const items = db.renewals
      .filter(r => r.type === ui.renewTab && (ui.showArchived || r.status === 'active'))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (a.nextDueDate || '9999').localeCompare(b.nextDueDate || '9999');
      });

    $('#renew-list').innerHTML = items.length
      ? items.map(renewCard).join('')
      : (db.renewals.some(r => r.type === ui.renewTab)
        ? `<div class="empty">${bi('Nothing active here. Tick "Show archived" to see old ones.')}</div>`
        : emptyCard({
          ico: ui.renewTab === 'paylater' ? '&#128179;' : isSub ? '&#128257;' : '&#128196;',
          en: ui.renewTab === 'paylater' ? 'No PayLater yet' : isSub ? 'No subscriptions yet' : 'No IDs or renewals yet',
          egEn: ui.renewTab === 'paylater' ? 'Example: SPayLater, RM120 a month, 4 instalments left. Pick a quick-add button above, or add your own.' : isSub ? 'Example: Netflix, RM55 every month. Pick a quick-add button above, or add your own.' : 'Example: Passport, expires next year. Pick a quick-add button above, or add your own.'
        }));
  }

  /* ------------------------------------------------------------------ */
  /* Renewal wizard: subscription and document paths ask different things */
  /* ------------------------------------------------------------------ */
  const RENEW_TYPES = [
    { v: 'subscription', l: 'Subscription', s: 'Auto-debit: Netflix, AI tools, cloud storage', i: IC('loop') },
    { v: 'document', l: 'ID & renewal', s: 'Passport, road tax, insurance, contracts', i: IC('doc') },
    { v: 'paylater', l: 'PayLater', s: 'SPayLater, Atome, Grab PayLater instalments', i: IC('card') }
  ];

  // Quick-pick names come from what the user has already added, newest first (nothing is pre-filled by the app).
  function nameSuggestions(type) {
    const seen = new Set();
    const out = [];
    db.renewals.slice().reverse().forEach(r => {
      if (r.type !== type) return;
      const t = (r.title || '').trim();
      const k = t.toLowerCase();
      if (t && !seen.has(k)) { seen.add(k); out.push(t); }
    });
    return out.slice(0, 10);
  }

  const REMIND_TILES = [
    { v: 3, l: '3 days before' },
    { v: 14, l: '14 days before' },
    { v: 30, l: '30 days before' }
  ];

  function renewSteps(d) {
    const isPL = d.type === 'paylater';
    const isSub = !isPL && d.type !== 'document';
    const nType = isPL ? 'paylater' : isSub ? 'subscription' : 'document';

    const kind = {
      id: 'kind',
      title: 'What are you tracking?',
      sub: 'Pick a type. The next questions depend on it.',
      render: x => tiles('type', RENEW_TYPES, x.type),
      validate: x => !x.type ? 'Pick a type to continue' : ''
    };

    const name = {
      id: 'name',
      title: isPL ? 'Which PayLater?' : isSub ? 'Which subscription?' : 'Which document or renewal?',
      sub: nameSuggestions(nType).length ? 'Type a name, or tap one you added before.' : 'Type a name.',
      render: x => fInput('Name *', 'title', 'text', x.title, `placeholder="${esc(tr(isPL ? 'e.g. SPayLater' : isSub ? 'e.g. Netflix' : 'e.g. Passport'))}"`)
        + `<div class="suggest">${nameSuggestions(nType).map(s =>
          `<button type="button" class="chip-btn" data-fill="title" data-value="${esc(s)}">${esc(s)}</button>`).join('')}</div>`
        + safeNote(isSub || isPL ? '' : 'Only a name and a date are kept here. Do not enter passport or ID numbers.'),
      validate: x => !(x.title || '').trim() ? 'Enter a name to continue' : sensitiveErr(x, ['title'])
    };

    // Subscription path: cycle -> amount -> free trial?
    const cost = {
      id: 'cost',
      title: 'How often are you billed?',
      sub: 'Choose the billing cycle first.',
      render: x => tiles('cycle', [
        { v: 'monthly', l: 'Monthly', s: 'Billed every month', i: IC('cal') },
        { v: 'yearly', l: 'Yearly', s: 'Billed once a year', i: IC('cal') }
      ], x.cycle)
        + (x.cycle
          ? fInput(`${x.isTrial === 'yes' ? 'Price after the trial' : 'Amount per ' + (x.cycle === 'yearly' ? 'year' : 'month')} (${CURRENCY}) *`,
              'amount', 'number', x.amount, 'step="0.01" min="0" inputmode="decimal"')
            + `<div class="field"><span>${esc(tr('Is it a free trial?'))}</span></div>`
            + tiles('isTrial', [
              { v: 'no', l: 'No', s: 'Already paying', i: IC('card') },
              { v: 'yes', l: 'Free trial', s: 'Not billed yet', i: IC('gift') }
            ], x.isTrial)
          : ''),
      validate: x => !x.cycle ? 'Choose how often you are billed'
        : (x.amount === '' || x.amount == null) ? 'Enter the amount to continue'
        : !x.isTrial ? 'Say whether this is a free trial' : ''
    };

    // PayLater path: amount per instalment and how many are left
    const plcost = {
      id: 'plcost',
      title: 'What are you paying?',
      sub: 'The amount of one instalment, and how many are still to pay.',
      render: x => fInput(`Amount per instalment (${CURRENCY}) *`, 'amount', 'number', x.amount, 'step="0.01" min="0" inputmode="decimal"')
        + `<div class="field"><span>${esc(tr('Instalments left *'))}</span></div>`
        + tiles('left', [{ v: 3, l: '3 left' }, { v: 6, l: '6 left' }, { v: 12, l: '12 left' }], x.left, 3)
        + fInput('Or type a number', 'left', 'number', x.left, 'min="1" max="120" step="1" inputmode="numeric"'),
      validate: x => !(Number(x.amount) > 0) ? 'Enter the amount of one instalment'
        : !(Number(x.left) >= 1) ? 'Enter how many instalments are left' : ''
    };

    // Document path: does it repeat? -> optional cost
    const repeat = {
      id: 'repeat',
      title: 'Does it repeat?',
      sub: 'Choose how this item renews.',
      render: x => tiles('cycle', [
        { v: 'onetime', l: 'Expires once', s: 'Renew by hand when it expires', i: IC('hourglass') },
        { v: 'yearly', l: 'Renews every year', s: 'Road tax, insurance, domain', i: IC('cal') },
        { v: 'monthly', l: 'Renews every month', s: 'Rent, phone line', i: IC('cal') }
      ], x.cycle)
        + (x.cycle ? fInput(`Renewal cost (${CURRENCY}, optional)`, 'amount', 'number', x.amount, 'step="0.01" min="0" inputmode="decimal"') : ''),
      validate: x => !x.cycle ? 'Choose an option to continue' : ''
    };

    const dateLabel = isPL ? 'Next instalment due *' : isSub
      ? (d.isTrial === 'yes' ? 'Trial ends on *' : 'Next billing date *')
      : (d.cycle === 'onetime' ? 'Expires on *' : 'Next renewal date *');

    const when = {
      id: 'when',
      title: isPL ? 'When is the next instalment?' : isSub ? (d.isTrial === 'yes' ? 'When does the trial end?' : 'When is the next charge?') : (d.cycle === 'onetime' ? 'When does it expire?' : 'When is the next renewal?'),
      sub: 'We will remind you before this date.',
      render: x => fInput(dateLabel, 'nextDueDate', 'date', x.nextDueDate)
        + `<div class="field"><span>${esc(tr('Remind me'))}</span></div>`
        + tiles('remindDaysBefore', REMIND_TILES, x.remindDaysBefore, 3),
      validate: x => !x.nextDueDate ? 'Pick a date to continue' : ''
    };

    return isPL ? [kind, name, plcost, when] : isSub ? [kind, name, cost, when] : [kind, name, repeat, when];
  }

  function openRenewForm(id) {
    const r = id ? db.renewals.find(x => x.id === id) : {};
    if (!r) return;
    const data = { ...r };
    data.isTrial = r.isTrial ? 'yes' : 'no';
    data.remindDaysBefore = r.remindDaysBefore || 14;

    openWizard({
      title: id ? 'Edit Renewal' : 'New Renewal',
      data,
      editing: !!id,
      finishLabel: id ? 'Save changes' : 'Save',
      getSteps: renewSteps,
      extraLast: () => id ? `<button type="button" class="btn danger block wz-delete" data-action="del-renew" data-id="${esc(id)}">${esc(tr('Delete this item'))}</button>` : '',
      finish: d => {
        const rec = {
          id: r.id || uid(),
          title: d.title.trim(),
          type: d.type,
          amount: (d.amount === '' || d.amount == null) ? 0 : Number(d.amount),
          cycle: d.type === 'paylater' ? 'monthly' : d.cycle,
          ...(d.type === 'paylater' ? { left: Math.max(1, Math.round(Number(d.left)) || 1) } : {}),
          nextDueDate: d.nextDueDate,
          remindDaysBefore: Number(d.remindDaysBefore),
          status: r.status || 'active',
          isTrial: d.type === 'subscription' && d.isTrial === 'yes',
          createdAt: r.createdAt || new Date().toISOString()
        };
        if (commit(() => upsert(db.renewals, rec))) {
          ui.renewTab = rec.type;
          closeModal();
          renderAll();
          toast(id ? 'Item updated' : 'Item added');
        }
      }
    });
  }

  // Keeps the original day of month: a bill due on the 31st goes Jan 31, Feb 28, Mar 31 (not Mar 28).
  function addMonthsKeepDay(iso, n, day) {
    const d = parseISO(iso);
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
    return toISO(r);
  }
  // The day of month this bill really falls on. The saved anchorDay is used only while the date still matches it
  // (the user may have edited the date since).
  function renewDay(r) {
    const cur = parseISO(r.nextDueDate);
    const a = Number(r.anchorDay) || 0;
    const clamp = a > 0 ? Math.min(a, new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()) : 0;
    const day = clamp && cur.getDate() === clamp ? a : cur.getDate();
    r.anchorDay = day;
    return day;
  }
  function advanceRenewal(r) {
    const step = r.cycle === 'yearly' ? 12 : 1;
    const day = renewDay(r);
    let i = 1;
    let next = addMonthsKeepDay(r.nextDueDate, step, day);
    let guard = 0;
    // If the item was paid very late, keep stepping until the date is today or later.
    while (daysUntil(next) < 0 && guard++ < 600) { i++; next = addMonthsKeepDay(r.nextDueDate, step * i, day); }
    r.nextDueDate = next;
    r.isTrial = false;
  }

  /* ------------------------------------------------------------------ */
  /* Calendar reminder (.ics) for a bill or expiry date                   */
  /* ------------------------------------------------------------------ */
  // Download a standard .ics file (all-day event, alarm at 9am before the due date) that any phone calendar can import.
  function downloadIcs(kind, id) {
    let title, date, note = '', rrule = '', before = 1;
    if (kind === 'renew') {
      const r = db.renewals.find(x => x.id === id); if (!r) return;
      title = r.title; date = r.nextDueDate; note = [r.amount ? money(r.amount) : '', CYCLE_LABEL[r.cycle] || ''].filter(Boolean).join(' / ');
      rrule = r.cycle === 'monthly' ? 'FREQ=MONTHLY' + (r.type === 'paylater' && Number(r.left) > 0 ? ';COUNT=' + Number(r.left) : '') : r.cycle === 'yearly' ? 'FREQ=YEARLY' : '';
      before = Number(r.remindDaysBefore) || 1;
    }
    if (!date) { toast(tr('Pick a due date first')); return; }
    const esc2 = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const d8 = iso => iso.replace(/-/g, '');
    const nd = parseISO(date); nd.setDate(nd.getDate() + 1);
    const h = before * 24 - 9;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stowhive//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${id}-${date}@stowhive`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      `DTSTART;VALUE=DATE:${d8(date)}`, `DTEND;VALUE=DATE:${d8(toISO(nd))}`, `SUMMARY:${esc2(title)}`,
      note ? `DESCRIPTION:${esc2(note)}` : '', rrule ? `RRULE:${rrule}` : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc2(title)}`, h >= 0 ? `TRIGGER:-PT${h}H` : `TRIGGER:PT${-h}H`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = (title.replace(/[^\w-]+/g, '_').slice(0, 40) || 'reminder') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ------------------------------------------------------------------ */
  /* Backup: export JSON / CSV, import JSON                              */
  /* ------------------------------------------------------------------ */
  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Quote a CSV cell. A leading = + - @ is neutralised so spreadsheets do not run it as a formula.
  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildCsv() {
    const rows = [['Kind', 'Name', 'Category / type', 'Amount', 'Added', 'Due date', 'Status', 'Details']];
    db.assets.forEach(a => rows.push([
      'Asset', a.name, a.category, a.price, a.purchaseDate, a.warrantyExpiry ? a.warrantyExpiry : '',
      a.warrantyExpiry ? (daysUntil(a.warrantyExpiry) < 0 ? 'Warranty expired' : 'In warranty') : 'No warranty',
      [a.locationText ? 'Location: ' + a.locationText : '', a.nextMaintenanceDate ? 'Next service: ' + a.nextMaintenanceDate : ''].filter(Boolean).join('; ')
    ]));
    db.renewals.forEach(r => rows.push([
      r.type === 'subscription' ? 'Subscription' : r.type === 'paylater' ? 'PayLater' : 'Renewal', r.title, CYCLE_LABEL[r.cycle] || '', r.amount,
      (r.createdAt || '').slice(0, 10), r.nextDueDate,
      r.status === 'active' ? (r.isTrial ? 'Active (free trial)' : 'Active') : 'Archived', r.type === 'paylater' ? `${Number(r.left) || 0} instalment(s) left` : ''
    ]));
    db.schedule.forEach(x => rows.push(['Schedule', x.title, x.time || '', '', x.date, '', x.repeat ? 'Repeats ' + x.repeat : (x.done ? 'Done' : 'Open'), '']));
    db.habits.forEach(h => rows.push(['Habit', h.name, '', '', (h.createdAt || '').slice(0, 10), '', `${(h.dates || []).length} day(s) done`, '']));
    db.todos.forEach(x => rows.push(['To-do', x.title, '', '', (x.createdAt || '').slice(0, 10), '', x.done ? 'Done' : 'Open', '']));
    db.journal.forEach(x => rows.push(['Diary', x.text || '', x.mood ? 'Mood ' + x.mood + '/5' : '', '', x.date, '', '', '']));
    db.expenses.forEach(x => rows.push(['Spending', x.note || '', catOf(x).en, x.amount, x.date, '', '', '']));
    return '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  // Turn an uploaded backup into clean data. Returns null if the file is not a Stowhive backup.
  function parseBackup(text) {
    let p;
    try { p = JSON.parse(text); } catch (e) { return null; }
    if (!p || typeof p !== 'object' || !(Array.isArray(p.assets) || Array.isArray(p.renewals) || Array.isArray(p.expenses) || Array.isArray(p.schedule))) return null;
    const clean = arr => (Array.isArray(arr) ? arr : [])
      .filter(x => x && typeof x === 'object' && !Array.isArray(x))
      .map(x => ({ ...x, id: String(x.id || uid()), createdAt: typeof x.createdAt === 'string' ? x.createdAt : new Date().toISOString() }));
    const strs = a => (Array.isArray(a) ? a : []).filter(s => typeof s === 'string');
    const next = Store.normalize({
      assets: clean(p.assets),
      renewals: clean(p.renewals),
      expenses: clean(p.expenses).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') && Number(x.amount) > 0),
      schedule: clean(p.schedule).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') && typeof x.title === 'string' && x.title),
      habits: clean(p.habits).filter(x => typeof x.name === 'string' && x.name).map(x => ({ ...x, dates: (Array.isArray(x.dates) ? x.dates : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) })),
      todos: clean(p.todos).filter(x => typeof x.title === 'string' && x.title),
      journal: clean(p.journal).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')),
      notes: clean(p.notes).filter(x => typeof x.title === 'string' || typeof x.body === 'string'),
      work: clean(p.work).filter(x => typeof x.title === 'string' && x.title),
      budget: p.budget,
      custom: { assetCats: strs(p.custom && p.custom.assetCats), hiddenCats: strs(p.custom && p.custom.hiddenCats) }
    });
    scrubOldData(next);
    return next;
  }

  const settingsSection = () => `
    <div class="backup settings">
      <h4>${esc(tr('Settings'))}</h4>
      <p class="card-sub">${esc(tr('Pages you do not need can be turned off. Your data is kept.'))}</p>
      ${FEATURES.map(f => `<div class="set-row"><span>${esc(tr(f[2]))}</span><div class="seg"><button type="button" class="${featOn(f[0]) ? 'on' : ''}" data-action="set-feat" data-feat="${f[0]}" data-on="1">${esc(tr('On'))}</button><button type="button" class="${featOn(f[0]) ? '' : 'on'}" data-action="set-feat" data-feat="${f[0]}" data-on="0">${esc(tr('Off'))}</button></div></div>`).join('')}
      <div class="set-row"><span>${esc(tr('Language'))}</span>
        <div class="seg">
          <button type="button" class="${window.L.lang === 'en' ? 'on' : ''}" data-action="set-lang" data-lang="en">English</button>
          <button type="button" class="${window.L.lang === 'zh' ? 'on' : ''}" data-action="set-lang" data-lang="zh">&#20013;&#25991;</button>
        </div></div>
      <div class="set-row"><span>${esc(tr('Theme'))}</span>
        <div class="seg">
          <button type="button" class="${isDark() ? '' : 'on'}" data-action="set-theme" data-theme="light">${esc(tr('Light'))}</button>
          <button type="button" class="${isDark() ? 'on' : ''}" data-action="set-theme" data-theme="dark">${esc(tr('Dark'))}</button>
        </div></div>
      <div class="set-row"><span>${esc(tr('Guide'))}</span>
        <button type="button" class="btn small ghost" data-action="show-intro">${esc(tr('Show guide'))}</button></div>
    </div>`;

  const backupSection = () => settingsSection() + `
    <div class="backup">
      <h4>${esc(tr('Backup'))}</h4>
      <p class="card-sub">${esc(tr('Save a copy of your data, or restore one. Import replaces everything on this device.'))}</p>
      <div class="card-actions">
        <button type="button" class="btn small ghost" data-bk="json">${esc(tr('Export JSON'))}</button>
        <button type="button" class="btn small ghost" data-bk="csv">${esc(tr('Export CSV'))}</button>
        <button type="button" class="btn small ghost" data-bk="import">${esc(tr('Import JSON'))}</button>
      </div>
      <input type="file" id="bk-file" accept=".json,application/json" hidden>
    </div>`;

  function wireBackup(root) {
    const body = $('.sheet-body', root);
    const file = $('#bk-file', body);
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-bk]');
      if (!b) return;
      const stamp = todayISO();
      if (b.dataset.bk === 'json') {
        downloadFile(`stowhive-backup-${stamp}.json`, JSON.stringify(db, null, 2), 'application/json');
        toast('Backup downloaded');
      } else if (b.dataset.bk === 'csv') {
        downloadFile(`stowhive-export-${stamp}.csv`, buildCsv(), 'text/csv;charset=utf-8');
        toast('CSV downloaded');
      } else {
        file.click();
      }
    });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast('That file is too large'); return; }
      const next = parseBackup(await f.text());
      if (!next) { toast('This is not a Stowhive backup file'); return; }
      const ok = await confirmDialog({
        title: 'Replace all data?',
        message: tr('This device will be replaced with the backup: {a} item(s), {b} renewal(s), {c} spending entries.', { a: next.assets.length, b: next.renewals.length, c: next.expenses.length }) + (Cloud.user ? ' ' + tr('Your cloud copy will be replaced too.') : '') + ' ' + tr('Export first if you want to keep the current data.'),
        confirmLabel: 'Replace'
      });
      if (!ok) return;
      if (commit(() => { db = next; })) {
        closeModal();
        renderAll();
        toast('Backup restored');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Today: habits, to-do list, mood and one-line diary                  */
  /* ------------------------------------------------------------------ */
  const MOODS = [
    { v: 1, i: window.SHI.face(1), en: 'Rough' }, { v: 2, i: window.SHI.face(2), en: 'Low' }, { v: 3, i: window.SHI.face(3), en: 'Okay' },
    { v: 4, i: window.SHI.face(4), en: 'Good' }, { v: 5, i: window.SHI.face(5), en: 'Great' }
  ];
  const moodOf = v => MOODS.find(m => m.v === Number(v));
  const HABIT_IDEAS = ['Drink water', 'Exercise', 'Read', 'Sleep early', 'Take vitamins'];

  const habitDone = (h, iso) => (h.dates || []).includes(iso);
  // A habit only counts from the day it was created (days before that are neither "missed" nor in the stats).
  const habitStart = h => (h.createdAt ? toISO(new Date(h.createdAt)) : '');
  const habitSched = (h, iso) => {
    const st = habitStart(h);
    if (st && iso < st && !habitDone(h, iso)) return false;
    return !(h.days && h.days.length) || h.days.includes(parseISO(iso).getDay());
  };
  const wdNarrow = i => new Date(2024, 0, 7 + i).toLocaleDateString(LOCALE(), { weekday: 'narrow' });
  const habitStreak = h => {
    let d = todayISO(), n = 0;
    if (habitSched(h, d) && !habitDone(h, d)) d = addDays(d, -1);
    for (let i = 0; i < 800; i++) {
      if (!habitSched(h, d)) { d = addDays(d, -1); continue; }
      if (!habitDone(h, d)) break;
      n++; d = addDays(d, -1);
    }
    return n;
  };
  const last7 = () => Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));
  const activeHabits = () => db.habits.filter(h => !h.archived);

  const habitRow = (h, iso, lite) => {
    iso = iso || todayISO();
    const done = habitDone(h, iso);
    const n = habitStreak(h);
    return `<div class="hb-row ${done ? 'done' : ''} ${habitSched(h, iso) ? '' : 'rest'}">
      <button type="button" class="sch-check" data-action="hb-toggle" data-id="${esc(h.id)}" data-date="${esc(iso)}" role="checkbox" aria-checked="${done ? 'true' : 'false'}" aria-label="${esc(h.name)}">${done ? '&#10003;' : ''}</button>
      <div class="hb-main"><span class="hb-name">${esc(h.name)}</span>${lite ? '' : `<span class="hb-days" role="group" aria-label="${esc(tr('Repeat'))}">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" class="hb-day ${!(h.days && h.days.length) || h.days.includes(i) ? 'on' : ''}" data-action="hb-day" data-id="${esc(h.id)}" data-d="${i}">${esc(wdNarrow(i))}</button>`).join('')}</span><span class="hb-dots">${last7().map(d => `<i class="${habitDone(h, d) ? 'on' : habitSched(h, d) ? '' : 'off'}"></i>`).join('')}</span>`}</div>
      <span class="hb-streak">${n ? IC('flame') + ' ' + esc(tr('{n} day streak', { n })) : ''}</span>
      ${lite ? '' : `<button type="button" class="icon-btn" data-action="hb-del" data-id="${esc(h.id)}" aria-label="${esc(tr('Delete'))}">&times;</button>`}
    </div>`;
  };

  const todoRow = t => `<div class="sch-row ${t.done ? 'done' : ''}">
      <button type="button" class="sch-check" data-action="td-toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="${t.done ? 'true' : 'false'}" aria-label="${esc(tr('Mark as done'))}">${t.done ? '&#10003;' : ''}</button>
      <span class="sch-title">${esc(t.title)}</span>
      <button type="button" class="icon-btn" data-action="td-del" data-id="${esc(t.id)}" aria-label="${esc(tr('Delete'))}">&times;</button>
    </div>`;

  const journalOn = iso => db.journal.find(j => j.date === iso);
  // Move a diary entry to another day. If that day already has one, ask before replacing it.
  async function moveDiary(id, date, mood, text) {
    const target = db.journal.find(j => j.date === date && j.id !== id);
    if (target) {
      const ok = await confirmDialog({
        title: tr('Replace the entry on {d}?', { d: fmtDate(date) }),
        message: tr('That day already has a diary entry. It will be replaced.'),
        confirmLabel: tr('Replace')
      });
      if (!ok) return;
    }
    if (commit(() => {
      db.journal = db.journal.filter(j => j.id !== id && !(target && j.id === target.id));
      db.journal.push({ id: 'j' + date, date, mood, text, createdAt: new Date().toISOString() });
    })) {
      ui.jEdit = null;
      ui.jDate = date === todayISO() ? null : date;
      renderDaily(); renderHome(); toast(tr('Saved'));
    }
  }
  // Date the diary form is writing for: any past day or today, never the future.
  const jDateOf = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') && v <= todayISO() ? v : todayISO());


  function habitReportHtml() {
    const hs = activeHabits();
    if (!hs.length) {
      // Keep the card (and the page layout) even with no habits yet.
      const strip0 = Array.from({ length: 7 }, (_, i) => `<span class="wk-d none"><i></i><small>${esc(wdNarrow((i + 1) % 7))}</small></span>`).join('');
      return `<section class="panel"><h3>${esc(tr('Weekly report'))}<small>${esc(tr('This week'))}</small></h3><div class="pn-body">
        <p class="panel-note">${esc(tr('No habits yet. Add one and your weekly check-in report will show up here.'))}</p>
        <h5 class="cal-sub">${esc(tr('Each day this week'))}</h5><div class="wk-strip">${strip0}</div></div></section>`;
    }
    const t = todayISO(), ws = addDays(t, -((parseISO(t).getDay() + 6) % 7)), lw = addDays(ws, -7), lwEnd = addDays(ws, -1);
    const stat = (h, from, to) => { let a = 0, b = 0; for (let x = from; x <= to; x = addDays(x, 1)) if (habitSched(h, x)) { a++; if (habitDone(h, x)) b++; } return { s: a, d: b }; };
    let ts = 0, td = 0, ls = 0, ld = 0;
    const rows = hs.map(h => { const a = stat(h, ws, t), b = stat(h, lw, lwEnd); ts += a.s; td += a.d; ls += b.s; ld += b.d;
      return `<div class="cat-row"><span class="cat-n">${esc(h.name)}</span><span class="cat-bar"><i style="width:${a.s ? Math.round(a.d / a.s * 100) : 0}%"></i></span><span class="cat-v">${a.d}/${a.s}</span></div>`; }).join('');
    const pct = ts ? Math.round(td / ts * 100) : 0, lp = ls ? Math.round(ld / ls * 100) : null;
    const strip = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i), sc = d > t ? [] : hs.filter(h => habitSched(h, d)), dn = sc.filter(h => habitDone(h, d)).length;
      const st = d > t || !sc.length ? 'none' : dn === sc.length ? 'full' : dn > 0 ? 'part' : 'zero';
      return `<span class="wk-d ${st} ${d === t ? 'now' : ''}"><i>${st === 'full' ? '\u2713' : ''}</i><small>${esc(wdNarrow((i + 1) % 7))}</small></span>`;
    }).join('');
    return `<section class="panel"><h3>${esc(tr('Weekly report'))}<small>${esc(tr('This week'))}</small></h3><div class="pn-body">
      <div class="wr-top">${window.SHI.ring(pct, pct < 40 ? 'warn' : '', pct + '%', 72)}<p>${esc(tr('{a} of {b} habit check-ins done this week', { a: td, b: ts }))}${lp != null ? `<br><small>${esc(tr('Last week: {n}%', { n: lp }))}</small>` : ''}</p></div>
      ${rows}<h5 class="cal-sub">${esc(tr('Each day this week'))}</h5><div class="wk-strip">${strip}</div><p class="panel-note">${esc(tr('Tick = all habits done that day. Half = some done.'))}</p></div></section>`;
  }
  // Habits, to-do and mood now live in the day sheet; callers that used to redraw the Routine page just refresh it.
  function renderDaily() { refreshDayModal(); }

  const focusIn = sel => { try { if (matchMedia('(hover: hover)').matches) { const a = $(sel); if (a) a.focus(); } } catch (x) { /* ignore */ } };

  document.addEventListener('submit', e => {
    const fid = e.target.id;
    if (fid === 'habit-form' || fid === 'todo-form') {
      e.preventDefault();
      const name = String(new FormData(e.target).get('name') || '').trim().slice(0, fid === 'habit-form' ? 60 : 80);
      if (!name) return;
      if (looksSensitive(name)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
      const now = new Date().toISOString();
      const wd = new FormData(e.target).getAll('wd').map(Number), days = wd.length && wd.length < 7 ? wd : [];
      const ok = fid === 'habit-form'
        ? commit(() => { db.habits.push({ id: uid(), name, dates: [], days, createdAt: now }); })
        : commit(() => { db.todos.push({ id: uid(), title: name, done: false, createdAt: now }); });
      if (ok) { renderDaily(); renderHome(); focusIn('#' + fid + ' [name="name"]'); }
    } else if (fid === 'journal-form') {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const mood = Number(f.mood) || 0;
      const text = String(f.text || '').trim().slice(0, 120);
      if (!mood && !text) { toast(tr('Pick a mood or write a line')); return; }
      if (text && looksSensitive(text)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
      const date = jDateOf(f.date);
      const editing = ui.jEdit ? db.journal.find(j => j.id === ui.jEdit) : null;
      if (editing && editing.date !== date) { moveDiary(editing.id, date, mood, text); return; }
      ui.jDate = date === todayISO() ? null : date;
      ui.jEdit = null;
      if (commit(() => {
        const cur = db.journal.find(j => j.date === date);
        if (cur) { cur.mood = mood; cur.text = text; }
        else db.journal.push({ id: 'j' + date, date, mood, text, createdAt: new Date().toISOString() });
      })) { if (ui.dayEdit) ui.dayEdit.diary = false; renderDaily(); renderHome(); toast(tr('Saved')); }
    }
  });

  // Monthly repeating spending: add this month's entry once the day has come.
  function applyRecurring() {
    const rec = (db.budget && db.budget.recurring) || [];
    if (!rec.length) return;
    const today = todayISO(), cur = monthOf(today), add = [];
    rec.forEach(r => {
      let ym = r.start || cur;
      for (let n = 0; n < 36 && ym <= cur; n++) {
        const id = `rx-${r.id}-${ym}`, date = `${ym}-${pad(Math.min(r.day, daysInMonth(ym)))}`;
        if (date <= today && !db.expenses.some(e => e.id === id) && !(db.deleted && db.deleted[id]))
          add.push({ id, date, amount: r.amount, note: r.note || '', cat: r.cat, rec: 1, createdAt: new Date().toISOString() });
        const [y, m] = ym.split('-').map(Number);
        ym = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
      }
    });
    if (add.length) commit(() => { db.expenses.push(...add); });
  }

  /* ------------------------------------------------------------------ */
  /* Notes (memo) page                                                   */
  /* ------------------------------------------------------------------ */
  const NOTE_COLORS = ['', 'y', 'g', 'b', 'p', 'r'];
  let noteQuery = '';

  const noteSorted = () => {
    const q = noteQuery.trim().toLowerCase();
    return db.notes
      .filter(n => !q || (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
        || (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  };

  function noteCardHtml(n) {
    const d = (n.updatedAt || n.createdAt || '').slice(0, 10);
    const when = /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseISO(d).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' }) : '';
    return `<div class="note-card nc-${n.color || 'n'}" data-action="note-open" data-id="${esc(n.id)}" tabindex="0" role="button">
      <button type="button" class="note-pin ${n.pinned ? 'on' : ''}" data-action="note-pin" data-id="${esc(n.id)}" aria-label="${esc(tr(n.pinned ? 'Unpin' : 'Pin'))}" title="${esc(tr(n.pinned ? 'Unpin' : 'Pin'))}">${IC('tack')}</button>
      <h4>${esc(n.title || tr('Untitled'))}</h4>
      ${n.body ? `<p>${esc(n.body)}</p>` : ''}
      <small>${esc(when)}</small></div>`;
  }

  // Starter cards shown while there are only a few notes: tap one to open the editor with a ready-made layout.
  const NOTE_STARTERS = [
    { k: 'shop', ic: 'bag', title: 'Shopping list', body: () => '\u25a1 \n\u25a1 \n\u25a1 ' },
    { k: 'idea', ic: 'flask', title: 'Ideas', body: () => '\u2022 ' },
    { k: 'trip', ic: 'briefcase', title: 'Packing list', body: () => '\u25a1 \n\u25a1 \n\u25a1 ' },
    { k: 'meet', ic: 'cal', title: 'Meeting notes', body: () => [tr('Date'), tr('Who'), tr('Key points')].map(x => x + ': ').join('\n') }
  ];
  function noteStartersHtml() {
    const have = new Set(db.notes.map(n => (n.title || '').trim()));
    const ghost = (k, ic, label) => `<button type="button" class="note-ghost" data-action="note-tpl" data-k="${k}"><span class="ng-ic">${IC(ic)}</span><b>${esc(label)}</b></button>`;
    return `<h5 class="note-hint">${esc(tr('Start with a template'))}</h5><div class="note-ghosts">`
      + ghost('', 'plus', tr('Blank note'))
      + NOTE_STARTERS.filter(s => !have.has(tr(s.title))).map(s => ghost(s.k, s.ic, tr(s.title))).join('') + '</div>';
  }

  function renderNoteList() {
    const el = $('#note-list');
    if (!el) return;
    const list = noteSorted();
    const starters = !noteQuery.trim() && db.notes.length < 6 ? noteStartersHtml() : '';
    if (list.length) { el.innerHTML = list.map(noteCardHtml).join('') + starters; return; }
    el.innerHTML = `<div class="empty rich note-empty">${window.SHI.art('doc')}<p>${esc(tr(db.notes.length ? 'No notes match your search.' : 'No notes yet. Tap New note to write your first one.'))}</p></div>` + starters;
  }

  function renderNotes() {
    const el = $('#notes');
    if (!el) return;
    el.innerHTML = `<section class="panel p-notes"><h3>${esc(tr('Notes'))}</h3><div class="note-bar">
        <input id="note-search" type="search" placeholder="${esc(tr('Search notes...'))}" value="${esc(noteQuery)}" aria-label="${esc(tr('Search notes...'))}">
        <button type="button" class="btn primary" data-action="note-new">+ ${esc(tr('New note'))}</button>
      </div>
      <div id="note-list" class="note-grid"></div></section>`;
    renderNoteList();
  }

  document.addEventListener('input', e => {
    if (e.target.id === 'note-search') { noteQuery = e.target.value; renderNoteList(); }
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('note-card')) { e.preventDefault(); openNote(e.target.dataset.id); }
  });

  // Editor: saves by itself while typing, so nothing is lost when the sheet is closed.
  function openNote(id, preset) {
    const ex = id ? db.notes.find(n => n.id === id) : null;
    if (id && !ex) return;
    if (ex) preset = null;
    const st = { id: ex ? ex.id : uid(), color: ex ? ex.color || '' : '', pinned: ex ? !!ex.pinned : false };
    openModal(tr('Note'), `<form id="note-form" class="note-form" autocomplete="off">
        <input name="title" class="note-title" type="text" maxlength="80" placeholder="${esc(tr('Title'))}" value="${esc(ex ? ex.title : preset ? preset.title : '')}" aria-label="${esc(tr('Title'))}">
        <textarea name="body" class="note-body" maxlength="20000" placeholder="${esc(tr('Write something...'))}" aria-label="${esc(tr('Note'))}">${esc(ex ? ex.body : preset ? preset.body : '')}</textarea>
        <div class="note-tools">
          <div class="note-colors" role="group" aria-label="${esc(tr('Color'))}">${NOTE_COLORS.map(c => `<button type="button" class="nc-dot nc-${c || 'n'} ${st.color === c ? 'on' : ''}" data-nc="${c}" aria-label="${esc(tr('Color'))}"></button>`).join('')}</div>
          <button type="button" class="btn small ghost" data-np="1">${esc(tr(st.pinned ? 'Pinned' : 'Pin'))}</button>
        </div>
        <p class="panel-note">${esc(tr('Notes are saved automatically.'))}</p>
        <div class="note-actions">
          ${ex ? `<button type="button" class="btn ghost" data-nd="1">${esc(tr('Delete'))}</button>` : ''}
          <button type="submit" class="btn primary">${esc(tr('Done'))}</button>
        </div>
      </form>`, root => {
      const form = $('#note-form', root), f = form.elements;
      let timer = 0;
      const flush = () => {
        clearTimeout(timer);
        const title = String(f.title.value).trim().slice(0, 80), body = String(f.body.value).slice(0, 20000);
        if (!title && !body.trim()) return true;
        if (preset && !db.notes.some(n => n.id === st.id) && title === preset.title && body === preset.body) return true; // untouched template: don't save
        if (looksSensitive(title + ' ' + body)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return false; }
        const cur = db.notes.find(n => n.id === st.id);
        if (cur && cur.title === title && cur.body === body && !!cur.pinned === st.pinned && (cur.color || '') === st.color) return true;
        return commit(() => {
          if (cur) { cur.title = title; cur.body = body; cur.color = st.color; cur.pinned = st.pinned; }
          else db.notes.push({ id: st.id, title, body, color: st.color, pinned: st.pinned, createdAt: new Date().toISOString() });
        });
      };
      form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(flush, 500); });
      form.addEventListener('submit', e => { e.preventDefault(); if (flush()) { closeModal(); renderNotes(); } });
      form.addEventListener('click', e => {
        const c = e.target.closest('[data-nc]'), p = e.target.closest('[data-np]'), d = e.target.closest('[data-nd]');
        if (c) {
          st.color = c.dataset.nc;
          form.querySelectorAll('.nc-dot').forEach(x => x.classList.toggle('on', x === c));
          flush();
        } else if (p) {
          st.pinned = !st.pinned;
          p.textContent = tr(st.pinned ? 'Pinned' : 'Pin');
          flush();
        } else if (d) {
          clearTimeout(timer);
          closeModal();
          removeRecord('notes', st.id, 'Note');
          renderNotes();
        }
      });
      // Closing with the x or by tapping outside also saves what is typed.
      root.addEventListener('click', e => {
        if (e.target.closest('[data-action="close-modal"]') || e.target.matches('[data-action="backdrop"]')) { flush(); renderNotes(); }
      }, true);
      if (!ex) focusIn(preset ? '#note-form [name="body"]' : '#note-form [name="title"]');
    });
  }


  /* ------------------------------------------------------------------ */
  /* Daily Work: things to check often. "Check now" logs the time.       */
  /* ------------------------------------------------------------------ */
  // Passwords are kept in their own key on this device only. They are never part of db,
  // so they are not synced to the cloud and not included in backups or exports.
  const WPW_KEY = 'stowhive.work.pw';
  const pwAll = () => { try { return JSON.parse(localStorage.getItem(WPW_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const pwGet = id => String(pwAll()[id] || '');
  const pwSet = (id, v) => {
    const m = pwAll();
    if (v) m[id] = v; else delete m[id];
    try { localStorage.setItem(WPW_KEY, JSON.stringify(m)); return true; } catch (e) { return false; }
  };
  const MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

  // w.checks is a list of ISO timestamps, oldest first: one entry per press of "Check now".
  const dayOf = ts => toISO(new Date(ts));
  const checksOn = (w, iso) => (w.checks || []).filter(t => dayOf(t) === iso);
  const checkedToday = w => checksOn(w, todayISO()).length > 0;
  const hhmm = ts => new Date(ts).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit', hour12: false });
  function workStreak(w) {
    const days = new Set((w.checks || []).map(dayOf));
    let d = todayISO(), n = 0;
    if (!days.has(d)) d = toISO(new Date(parseISO(d).getTime() - DAY_MS));
    while (days.has(d)) { n++; d = toISO(new Date(parseISO(d).getTime() - DAY_MS)); }
    return n;
  }
  function lastCheckedText(w) {
    const c = w.checks || [];
    if (!c.length) return tr('Not checked yet');
    const last = c[c.length - 1];
    const day = dayOf(last) === todayISO() ? tr('Today') : new Date(last).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
    return tr('Last checked {t}', { t: day + ' ' + hhmm(last) });
  }

  // One link per box: "Dashboard https://x.com" or just "x.com/path". Only http(s) is accepted.
  function parseLinks(text) {
    const out = [];
    const trim = x => x.replace(/^[\s:|\u2013\u2014-]+|[\s:|\u2013\u2014-]+$/g, '').trim();
    String(text || '').split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line) return;
      let url = '', label = '';
      const m = line.match(/https?:\/\/\S+/i);
      const lf = line.match(/^(?:(.*?)\s+)?(file:\/\/\/.+|[A-Za-z]:[\\\/].*)$/i); // local file or folder on this computer
      if (lf && !m) {
        let p = lf[2].trim().replace(/\\/g, '/');
        url = /^file:/i.test(p) ? p : 'file:///' + p;
        label = trim(lf[1] || '');
      }
      else if (m) { url = m[0]; label = trim(line.replace(m[0], '')); }
      else {
        const tok = line.split(/\s+/).pop();
        if (!/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(tok)) return;
        url = 'https://' + tok; label = trim(line.slice(0, line.length - tok.length));
      }
      try {
        const u = new URL(url);
        if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'file:') out.push({ label: label.slice(0, 40), url: u.href });
      } catch (e) { /* skip bad link */ }
    });
    return out.slice(0, 2);
  }
  const linkText = l => (l ? (l.label ? l.label + ' ' : '') + l.url : '');
  const hostOf = u => { try { const x = new URL(u); if (x.protocol === 'file:') return decodeURIComponent(x.pathname.split('/').filter(Boolean).pop() || 'file'); return x.hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  // Link button: icon tile + short name. A leading emoji in the name becomes the icon; otherwise the first letter on a colour taken from the site.
  const EMOJI_RE = /^\s*(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;
  function linkDisp(l) {
    let label = String(l.label || '').trim(), icon = '';
    const m = label.match(EMOJI_RE);
    if (m) { icon = m[1]; label = label.slice(m[0].length).trim(); }
    const host = hostOf(l.url);
    const isFile = /^file:/i.test(l.url);
    const parts = host.split('.');
    const short = isFile ? host.replace(/\.[^.]+$/, '') : (parts.length > 2 ? parts[0] : parts[0]);
    const name = label || short || host;
    if (!icon) icon = (name.trim().charAt(0) || '?').toUpperCase();
    let h = 0; const key = isFile ? 'file' : parts.slice(-2).join('.');
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    return { icon, name, hue: h };
  }

  function workCardHtml(w) {
    const today = checksOn(w, todayISO()), n = today.length, st = workStreak(w);
    const links = (w.links || []).filter(l => l && /^(https?|file):\/\//i.test(l.url)).slice(0, 2);
    const hasPw = !!pwGet(w.id);
    const ib = (act, ico, tip, on) => `<button type="button" class="dw-ib ${on ? 'on' : ''}" data-action="${act}" data-id="${esc(w.id)}" title="${esc(tr(tip))}" aria-label="${esc(tr(tip))}">${IC(ico)}</button>`;
    const row = (ico, label, valHtml, btns) => `<div class="dw-row"><span class="dw-k">${IC(ico)}<em>${esc(tr(label))}</em></span>${valHtml}${btns}</div>`;
    const mini = (act, what, ico, tip) => `<button type="button" class="dw-mini" data-action="${act}" data-id="${esc(w.id)}" data-what="${what}" title="${esc(tr(tip))}" aria-label="${esc(tr(tip))}">${IC(ico)}</button>`;
    return `<div class="dw-card ${n ? 'done' : ''} ${w.star ? 'star' : ''}" data-id="${esc(w.id)}">
      <div class="dw-top">
        <span class="dw-av" aria-hidden="true">${esc((w.title || '?').trim().charAt(0).toUpperCase())}</span>
        <div class="dw-main"><h4>${esc(w.title)}</h4>${w.note ? `<p>${esc(w.note)}</p>` : ''}</div>
        <div class="dw-ibs">${ib('work-star', 'star', w.star ? 'Unstar' : 'Star', w.star)}${ib('work-edit', 'edit', 'Edit')}${ib('work-del', 'trash', 'Delete')}</div>
      </div>
      <div class="dw-links">${links.map(l => { const d = linkDisp(l); return `<a class="dw-link" data-wid="${esc(w.id)}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc((l.label ? l.label + ' - ' : '') + l.url)}"><span class="dw-li" style="--h:${d.hue}">${esc(d.icon)}</span><span class="dw-ln">${esc(d.name)}</span></a>`; }).join('')}</div>
      <div class="dw-bot">
      <div class="dw-count">
        <div class="dw-n"><b>${esc(tr('\u00d7{n} today', { n }))}</b>${st >= 2 ? `<span class="dw-streak" title="${esc(tr('{n} day streak', { n: st }))}">${IC('flame')}${st}</span>` : ''}</div>
        <span class="dw-last">${esc(lastCheckedText(w))}</span>
      </div>
      ${w.account || hasPw ? `<div class="dw-cred">
        ${w.account ? row('user', 'Account', `<span class="dw-v">${esc(w.account)}</span>`, mini('work-copy', 'acct', 'copy', 'Copy')) : ''}
        ${hasPw ? row('lock', 'Password', `<span class="dw-v dw-pw" data-pw="${esc(w.id)}">${MASK}</span>`, mini('work-pw', 'pw', 'eye', 'Show') + mini('work-copy', 'pw', 'copy', 'Copy')) : ''}
      </div>` : ''}
      </div>
    </div>`;
  }

  function renderWork() {
    const el = $('#work');
    if (!el) return;
    const list = db.work.slice().sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const n = list.filter(checkedToday).length;
    el.innerHTML = `<section class="panel p-work">
      <div class="dw-head"><h3>${esc(tr('Daily Work'))}</h3>${list.length ? `<span class="dw-prog">${esc(tr('{a}/{b} checked today', { a: n, b: list.length }))}</span>` : ''}</div>
      <p class="panel-note">${esc(tr('Things to check often. Open a link and it counts as one check, with the time.'))}</p>
      <div class="dw-bar"><button type="button" class="btn primary" data-action="work-new">+ ${esc(tr('New task'))}</button></div>
      ${list.length ? `<div class="dw-list">${list.map(workCardHtml).join('')}</div>`
        : `<div class="empty rich">${window.SHI.art('briefcase')}<p>${esc(tr('No daily work yet. Add what you check every day, with its links and login.'))}</p></div>`}
    </section>`;
  }


  function copyText(text) {
    const ok = () => toast(tr('Copied'));
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, () => toast(tr('Copy failed'))); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast(tr('Copy failed')); }
    ta.remove();
  }

  // Delete a task (with Undo). Keep its password for the Undo window, then forget it if the task is really gone.
  function deleteWork(id) {
    if (!removeRecord('work', id, 'Task')) return;
    setTimeout(() => { if (!db.work.some(w => w.id === id)) pwSet(id, ''); }, 6500);
    renderWork(); renderHome();
  }

  function openWork(id) {
    const ex = id ? db.work.find(w => w.id === id) : null;
    if (id && !ex) return;
    const wid = ex ? ex.id : uid();
    const ph = 'placeholder="Dashboard https://example.com" maxlength="3000" spellcheck="false"';
    openModal(ex ? 'Edit task' : 'New task', `<form id="work-form" class="note-form" autocomplete="off" novalidate>
        ${fInput('Title', 'title', 'text', ex ? ex.title : '', 'maxlength="60" required')}
        ${fText('What to check', 'note', ex ? ex.note : '', 2, 'maxlength="300"')}
        ${fInput('Link 1', 'l1', 'text', ex ? linkText((ex.links || [])[0]) : '', ph)}
        ${fInput('Link 2', 'l2', 'text', ex ? linkText((ex.links || [])[1]) : '', ph)}
        ${fInput('Account', 'account', 'text', ex ? ex.account : '', 'maxlength="80" autocomplete="off" spellcheck="false"')}
        ${fInput('Password', 'pw', 'password', ex ? pwGet(wid) : '', 'maxlength="120" autocomplete="new-password"')}
        ${safeNote('Passwords stay on this device only. They are not synced to the cloud or saved in backups.')}
        <div class="note-actions">
          ${ex ? `<button type="button" class="btn ghost" data-wd="1">${esc(tr('Delete'))}</button>` : ''}
          <button type="submit" class="btn primary">${esc(tr('Save'))}</button>
        </div>
      </form>`, root => {
      const form = $('#work-form', root), f = form.elements;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const title = String(f.title.value).trim().slice(0, 60), note = String(f.note.value).trim().slice(0, 300);
        if (!title) { toast(tr('Please enter a title.')); return; }
        if (looksSensitive(title + ' ' + note)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
        const p1 = parseLinks(f.l1.value).slice(0, 1), p2 = parseLinks(f.l2.value).slice(0, 1);
        if ((f.l1.value.trim() && !p1.length) || (f.l2.value.trim() && !p2.length)) { toast(tr('That link does not look right. Use a full address starting with https:// or a file path like C:/folder/file.html')); return; }
        const links = [...p1, ...p2];
        const account = String(f.account.value).trim().slice(0, 80);
        const ok = commit(() => {
          if (ex) { ex.title = title; ex.note = note; ex.links = links; ex.account = account; }
          else db.work.push({ id: wid, title, note, links, account, star: false, checks: [], createdAt: new Date().toISOString() });
        });
        if (!ok) return;
        if (!pwSet(wid, String(f.pw.value))) toast(tr('Could not save the password on this device.'));
        closeModal(); renderWork(); renderHome();
      });
      form.addEventListener('click', e => {
        if (!e.target.closest('[data-wd]')) return;
        closeModal(); deleteWork(wid);
      });
      if (!ex) focusIn('#work-form [name="title"]');
    });
  }

  // If the tab stayed open past midnight, move everything that follows "today" to the new day.
  let lastRenderedDay = todayISO();
  function checkNewDay() {
    const t = todayISO();
    if (t === lastRenderedDay) return false;
    ui.calMonth = t.slice(0, 8) + '01';
    ui.calSel = t;
    ui.jDate = null;
    ui.jEdit = null;
    ui.expMonth = '';
    renderAll();
    return true;
  }

  function renderAll() {
    lastRenderedDay = todayISO();
    applyFeatures();
    applyRecurring();
    renderHeader();
    renderHome();
    renderDaily();
    renderNotes();
    renderWork();
    renderBudget();
    renderHelp();
    renderAssets();
    renderRenewals();
    if ($('#exp-modal')) renderExpModal();
  }

  const TAB_ORDER = ['home', 'daily', 'work', 'notes', 'renewals', 'assets', 'budget'];
  const TODAY_GROUP = ['home', 'work'];
  function updateFabLabel() {
    const rl = { subscription: 'Add Subscription', document: 'Add Renewal', paylater: 'Add PayLater' };
    const fabLabel = { home: 'Add', budget: 'Add', assets: 'Add Item', renewals: rl[ui.renewTab] || 'Add Renewal', daily: 'Add', work: 'Add', notes: 'Add' };
    const el = $('#fab .fab-text');
    if (el) el.textContent = tr(fabLabel[ui.tab] || 'Add');
  }

  function switchTab(tab) {
    // Routine used to be its own tab; it is now the lower part of Today, so old links land there.
    if (tab === 'daily') tab = 'home';
    if (['assets', 'budget', 'work'].includes(tab) && !featOn(tab)) { setFeat(tab, true); applyFeatures(); }
    if (tab !== ui.tab) {
      document.body.dataset.dir = TAB_ORDER.indexOf(tab) < TAB_ORDER.indexOf(ui.tab) ? 'back' : 'fwd';
      document.body.classList.add('tab-anim');
      clearTimeout(switchTab.t);
      switchTab.t = setTimeout(() => document.body.classList.remove('tab-anim'), 700);
    }
    ui.tab = tab;
    try { renderHeader(); } catch (e) { /* ignore */ }
    document.body.dataset.tab = tab;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${tab}`));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === (TODAY_GROUP.includes(tab) ? 'home' : tab)));
    const tt = $('#today-tabs');
    if (tt) { tt.style.display = TODAY_GROUP.includes(tab) ? '' : 'none'; $$('.subtab', tt).forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); }
    const moreBtn = $('.nav-more');
    if (moreBtn) moreBtn.classList.toggle('active', ['assets', 'budget'].includes(tab));
    updateFabLabel();
    // Home and Daily Budget already have their own add buttons on the page.
    $('.fab-wrap').style.display = (tab === 'home' || tab === 'budget' || tab === 'daily' || tab === 'work' || tab === 'notes') ? 'none' : '';
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------------------------------------------ */
  /* Event handling (delegated)                                          */
  /* ------------------------------------------------------------------ */
  const handlers = {
    tab: el => { closeModal(); switchTab(el.dataset.tab); },
    more: () => {
      if (!moreHasItems()) { handlers['more-settings'](); return; }
      const items = FEATURES.filter(f => f[0] !== 'work' && featOn(f[0])).map(f => [f[0], f[1], f[2], f[3], 'more-go']);
      items.push(['', 'user', 'Settings', 'Features, language, theme, backup', 'more-settings']);
      openModal('More', `<div class="tiles">${items.map(x => `<button type="button" class="tile ${ui.tab === x[0] ? 'sel' : ''}" data-action="${x[4]}" data-tab="${x[0]}"><span class="ti">${IC(x[1])}</span><span class="tl">${esc(tr(x[2]))}</span><small>${esc(tr(x[3]))}</small></button>`).join('')}</div>`);
    },
    'more-settings': () => { closeModal(); accTabKey = 'set'; openAccount(); },
    'set-feat': el => {
      const k = el.dataset.feat;
      setFeat(k, el.dataset.on === '1');
      applyFeatures();
      if (!featOn(k) && ui.tab === k) switchTab('home');
      renderHome();
      accTabKey = 'set'; openAccount();
    },
    'more-go': el => { closeModal(); switchTab(el.dataset.tab); },
    'work-new': () => openWork(),
    'work-edit': el => openWork(el.dataset.id),
    'work-check': el => {
      const w = db.work.find(x => x.id === el.dataset.id);
      if (!w) return;
      buzz('success');
      if (commit(() => { w.checks = [...(w.checks || []), new Date().toISOString()].slice(-500); })) { renderWork(); renderHome(); }
    },
    'work-undo': el => {
      const w = db.work.find(x => x.id === el.dataset.id);
      if (!w || !checksOn(w, todayISO()).length) return;
      if (commit(() => { w.checks = (w.checks || []).slice(0, -1); })) { renderWork(); renderHome(); }
    },
    'work-star': el => {
      const w = db.work.find(x => x.id === el.dataset.id);
      if (w && commit(() => { w.star = !w.star; })) renderWork();
    },
    'work-del': el => deleteWork(el.dataset.id),
    'work-copy': el => {
      const w = db.work.find(x => x.id === el.dataset.id);
      if (!w) return;
      const v = el.dataset.what === 'pw' ? pwGet(w.id) : (w.account || '');
      if (v) copyText(v);
    },
    'work-pw': el => {
      const span = el.closest('.dw-card') && el.closest('.dw-card').querySelector('.dw-pw');
      if (!span) return;
      const mask = () => { span.textContent = MASK; span.dataset.on = ''; el.title = tr('Show'); clearTimeout(span._t); };
      if (span.dataset.on) { mask(); return; }
      span.textContent = pwGet(span.dataset.pw) || MASK; span.dataset.on = '1'; el.title = tr('Hide');
      clearTimeout(span._t); span._t = setTimeout(mask, 10000); // hides itself again after 10 seconds
    },
    'note-new': () => openNote(),
    'note-tpl': el => {
      const s = NOTE_STARTERS.find(x => x.k === el.dataset.k);
      openNote(null, s ? { title: tr(s.title), body: s.body() } : null);
    },
    'note-open': el => openNote(el.dataset.id),
    'note-pin': el => {
      const n = db.notes.find(x => x.id === el.dataset.id);
      if (n && commit(() => { n.pinned = !n.pinned; })) renderNotes();
    },

    fab: () => {
      if (ui.tab === 'assets') openAssetForm();
      else openRenewForm();
    },

    'qa-spend': () => openSpendQuick(),

    'home-add': el => {
      const k = el.dataset.kind;
      if (k === 'todo') { openDayModal(todayISO(), { sch: true }); const f = $('#sch-form [name="title"]'); if (f) f.focus(); return; }
      if (k === 'asset') openAssetForm();
      else openRenewForm();
    },
    'sch-toggle': el => {
      const it = db.schedule.find(x => x.id === el.dataset.id);
      const iso = el.dataset.date;
      if (it && commit(() => {
        if (it.repeat) { const set = new Set(it.doneDates || []); if (set.has(iso)) set.delete(iso); else set.add(iso); it.doneDates = [...set].sort().slice(-800); }
        else it.done = !it.done;
      })) { renderHome(); refreshDayModal(); }
    },
    'day-open': el => openDayModal(el.dataset.date),
    'day-edit': el => {
      const k = el.dataset.k;
      ui.dayEdit = ui.dayEdit || {};
      ui.dayEdit[k] = !el.dataset.off;
      refreshDayModal();
      if (el.dataset.off) return;
      const f = $({ sch: '#sch-form [name="title"]', hab: '#habit-form [name="name"]', diary: '#journal-form [name="text"]' }[k]);
      if (f) { try { f.focus(); } catch (x) { /* ignore */ } }
    },
    'sch-edit': el => openSchEdit(el.dataset.id),
    'sch-del': el => { if (removeRecord('schedule', el.dataset.id, 'Schedule item')) { renderHome(); refreshDayModal(); } },
    'hb-toggle': el => {
      const h = db.habits.find(x => x.id === el.dataset.id);
      const t = /^\d{4}-\d{2}-\d{2}$/.test(el.dataset.date || '') ? el.dataset.date : todayISO();
      if (t > todayISO()) { toast(tr('Not yet')); return; }
      if (h) buzz(habitDone(h, t) ? 'tap' : 'success');
      if (h && commit(() => { const set = new Set(h.dates || []); if (set.has(t)) set.delete(t); else set.add(t); h.dates = [...set].sort().slice(-800); })) { renderDaily(); renderHome(); }
    },
    'hb-del': el => { if (removeRecord('habits', el.dataset.id, 'Habit')) { renderDaily(); renderHome(); } },
    // Tap a weekday on a habit to turn it on or off for that habit. All 7 on is stored as "every day".
    'hb-day': el => {
      const h = db.habits.find(x => x.id === el.dataset.id);
      if (!h) return;
      const d = Number(el.dataset.d), set = new Set(h.days && h.days.length ? h.days : [0, 1, 2, 3, 4, 5, 6]);
      if (set.has(d)) set.delete(d); else set.add(d);
      if (!set.size) { toast(tr('Keep at least one day')); return; }
      if (commit(() => { h.days = set.size === 7 ? [] : [...set].sort(); })) { renderDaily(); renderHome(); }
    },
    'hb-quick': el => {
      const name = tr(el.dataset.name);
      if (commit(() => { db.habits.push({ id: uid(), name, dates: [], createdAt: new Date().toISOString() }); })) { renderDaily(); renderHome(); }
    },
    'td-toggle': el => {
      const x = db.todos.find(v => v.id === el.dataset.id);
      if (x && commit(() => { x.done = !x.done; x.doneAt = x.done ? new Date().toISOString() : ''; })) { renderDaily(); renderHome(); }
    },
    'td-del': el => { if (removeRecord('todos', el.dataset.id, 'To-do')) { renderDaily(); renderHome(); } },
    'td-clear': async () => {
      const n = db.todos.filter(x => x.done).length;
      if (!n) return;
      const ok = await confirmDialog({ title: tr('Clear completed to-dos?'), message: tr('{n} completed to-dos will be removed.', { n }), confirmLabel: tr('Clear done') });
      if (ok && commit(() => { db.todos = db.todos.filter(x => !x.done); })) { renderDaily(); renderHome(); }
    },
    // Tapping a mood saves it straight away (together with whatever is typed in the line box).
    'mood-pick': el => {
      const form = el.closest('form');
      const v = Number(el.dataset.v);
      const input = form.querySelector('[name="mood"]');
      const same = Number(input.value) === v;
      const mood = same ? 0 : v;
      const text = String(form.querySelector('[name="text"]').value || '').trim().slice(0, 120);
      if (text && looksSensitive(text)) { toast(tr('This looks like an ID or card number. Please remove it to continue')); return; }
      const editing = ui.jEdit ? db.journal.find(j => j.id === ui.jEdit) : null;
      const date = editing ? editing.date : jDateOf((form.querySelector('[name="date"]') || {}).value);
      ui.jDate = date === todayISO() ? null : date;
      if (commit(() => {
        const cur = db.journal.find(j => j.date === date);
        if (!mood && !text) { db.journal = db.journal.filter(j => j.date !== date); return; }
        if (cur) { cur.mood = mood; cur.text = text; }
        else db.journal.push({ id: 'j' + date, date, mood, text, createdAt: new Date().toISOString() });
      })) { renderDaily(); renderHome(); }
    },
    'j-edit': el => {
      const j = db.journal.find(x => x.id === el.dataset.id);
      if (!j) return;
      ui.jEdit = j.id;
      ui.jDate = j.date === todayISO() ? null : j.date;
      renderDaily();
      focusIn('#journal-form [name="text"]');
    },
    'j-today': () => { ui.jDate = null; ui.jEdit = null; renderDaily(); },
    'j-del': el => { if (ui.jEdit === el.dataset.id) ui.jEdit = null; if (removeRecord('journal', el.dataset.id, 'Diary entry')) { renderDaily(); renderHome(); } },
    'budget-set': el => openBudgetForm(el.dataset.caps === '1'),
    'budget-suggest': () => {
      const total = Math.round(Number(db.budget.amount) || 0);
      if (!(total > 0)) return;
      const caps = {};
      let used = 0;
      const list = expCats(), w = c => (SPLIT[c.k] != null ? SPLIT[c.k] : 8), wt = list.reduce((t, c) => t + w(c), 0);
      list.slice(0, -1).forEach(c => { const v = Math.round(total * w(c) / wt); caps[c.k] = v; used += v; });
      caps[list[list.length - 1].k] = Math.max(0, total - used);
      Object.keys(caps).forEach(k => { if (!(caps[k] > 0)) delete caps[k]; });
      if (commit(() => { db.budget = { ...db.budget, caps, updatedAt: new Date().toISOString() }; })) {
        refreshSpending();
        toast(tr('Suggested split applied. Tap Edit limits to change it.'), { ms: 4000 });
      }
    },
    'exp-all': () => { ui.expMonth = monthOf(todayISO()); renderExpModal(); },
    'exp-month': el => {
      const next = addMonths((ui.expMonth || monthOf(todayISO())) + '-01', Number(el.dataset.d)).slice(0, 7);
      if (next > monthOf(todayISO())) return;
      ui.expMonth = next;
      renderExpModal();
    },
    'exp-del': el => {
      if (removeRecord('expenses', el.dataset.id, 'Spending')) {
        refreshSpending();
        if ($('#exp-modal')) renderExpModal();
      }
    },
    'cal-today': () => { ui.calMonth = todayISO().slice(0, 8) + '01'; ui.calSel = todayISO(); renderHome(); },
    'cal-nav': el => { ui.calMonth = addMonths(ui.calMonth, Number(el.dataset.d)); ui.calSel = null; renderHome(); },
    'cal-goto': el => {
      ui.calMonth = el.dataset.month;
      ui.calSel = null;
      renderHome();
      const c = $('#cal');
      if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'cal-day': el => openDayModal(el.dataset.date),
    'quick-add': el => { const p = QUICK_ADD[Number(el.dataset.i)]; if (p) openQuickAdd(p); },
    'asset-filter': el => { ui.assetFilter = el.dataset.f; renderAssets(); },
    'asset-cat': el => { ui.assetCat = el.dataset.cat; renderAssets(); },
    'toggle-asset': el => {
      const id = el.dataset.id;
      const open = !ui.expanded.has(id);
      if (open) ui.expanded.add(id); else ui.expanded.delete(id);
      // Toggle in place (no full re-render) so the card animates and the scroll position stays.
      const card = el.closest('.card');
      if (card) {
        card.classList.toggle('open', open);
        card.classList.toggle('anim', open);
      } else {
        renderAssets();
      }
    },
    'edit-asset': el => openAssetForm(el.dataset.id),
    'log-maint': el => openMaintForm(el.dataset.id),
    'del-asset': async el => {
      const id = el.dataset.id;
      const a = db.assets.find(x => x.id === id);
      if (!a) return;
      const ok = await confirmDialog({
        title: tr('Delete "{v}"?', { v: a.name }),
        message: 'The item and its maintenance history will be removed.',
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      if (removeRecord('assets', id, 'Item')) {
        ui.expanded.delete(id);
        closeModal();
        renderAll();
      }
    },

    rtab: el => { ui.renewTab = el.dataset.rtab; renderRenewals(); updateFabLabel(); },
    'renew-history': el => {
      const r = db.renewals.find(x => x.id === el.dataset.id);
      if (!r) return;
      const h = r.history || [];
      const sum = list => list.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const yr = String(new Date().getFullYear());
      openModal(`${tr('History')} - ${r.title}`, `
        <div class="stats">
          <div class="stat"><div class="l">${esc(tr('Paid in total'))}</div><div class="v">${esc(money(sum(h)))}</div></div>
          <div class="stat"><div class="l">${esc(tr('This year'))}</div><div class="v">${esc(money(sum(h.filter(x => x.date.startsWith(yr)))))}</div></div>
        </div>
        ${h.map(x => `<div class="ev-row"><span class="nm">${esc(fmtDate(x.date))} <small class="muted">${esc(tr('for {d}', { d: fmtDate(x.due) }))}</small></span><b>${x.amount ? esc(money(x.amount)) : '-'}</b></div>`).join('')}`);
    },
    'edit-renew': el => openRenewForm(el.dataset.id),
    // Renewed / archived are reversible, so there is no confirm popup, only an Undo toast.
    'renew-done': el => {
      const id = el.dataset.id;
      const r = db.renewals.find(x => x.id === id);
      if (!r) return;
      const before = { ...r };
      const pl = r.type === 'paylater';
      const onetime = r.cycle === 'onetime' || (pl && (Number(r.left) || 0) <= 1);
      const ok = commit(() => {
        // A trial ending is not a payment, so it is not written to the history.
        if (!r.isTrial) r.history = [{ date: todayISO(), due: r.nextDueDate, amount: Number(r.amount) || 0 }, ...(r.history || [])];
        if (onetime) { r.status = 'archived'; if (pl) r.left = 0; }
        else if (pl) { r.nextDueDate = addMonthsKeepDay(r.nextDueDate, 1, renewDay(r)); r.left = (Number(r.left) || 1) - 1; }
        else advanceRenewal(r);
      });
      if (!ok) return;
      renderAll();
      toast(onetime ? tr('"{v}" marked done', { v: r.title }) : tr('Next due {d}', { d: fmtDate(r.nextDueDate) }), {
        actionLabel: 'Undo', ms: 5000, onAction: () => undoRenewal(id, before)
      });
    },
    'renew-stop': el => {
      const id = el.dataset.id;
      const r = db.renewals.find(x => x.id === id);
      if (!r) return;
      const before = { ...r };
      if (!commit(() => { r.status = 'archived'; })) return;
      renderAll();
      toast(tr('"{v}" archived', { v: r.title }), {
        actionLabel: 'Undo', ms: 5000, onAction: () => undoRenewal(id, before)
      });
    },
    'renew-restore': el => {
      const r = db.renewals.find(x => x.id === el.dataset.id);
      if (r && commit(() => { r.status = 'active'; })) { renderAll(); toast('Restored'); }
    },
    'del-renew': async el => {
      const id = el.dataset.id;
      const r = db.renewals.find(x => x.id === id);
      if (!r) return;
      const ok = await confirmDialog({
        title: tr('Delete "{v}"?', { v: r.title }),
        message: 'It will be removed completely. Archive it instead if you only want to stop the reminders.',
        confirmLabel: 'Delete'
      });
      if (!ok) return;
      if (removeRecord('renewals', id, 'Item')) {
        closeModal();
        renderAll();
      }
    },

    'help-toggle': el => {
      const tab = el.dataset.tab;
      const next = !helpIsOpen(tab);
      const p = helpPref();
      p[tab] = next;
      lsSet(HELP_KEY, JSON.stringify(p));
      const box = el.closest('.page-help');
      if (box) box.classList.toggle('open', next);
      el.setAttribute('aria-expanded', String(next));
    },
    'start-hide': () => { lsSet(HIDE_START_KEY, '1'); renderHome(); toast(tr('Hidden. Tap ? any time to see the guide.')); },
    'load-sample': () => loadSample(),
    'clear-sample': () => clearSample(),
    'add-ics': el => downloadIcs(el.dataset.kind, el.dataset.id),
    jump: el => {
      const { tab, id, sub } = el.dataset;
      if (!tab || !id) return;
      if (tab === 'renewals' && sub) { ui.renewTab = sub; ui.showArchived = false; const c = $('#show-archived'); if (c) c.checked = false; }
      if (tab === 'assets') { ui.assetCat = 'All'; ui.assetQuery = ''; ui.assetFilter = 'all'; ui.expanded.add(id); const s = $('#asset-search'); if (s) s.value = ''; }
      switchTab(tab);
      renderAll();
      requestAnimationFrame(() => {
        const card = document.querySelector(`#view-${tab} [data-rid="${CSS.escape(id)}"]`);
        if (!card) return;
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card.classList.add('flash');
        setTimeout(() => card.classList.remove('flash'), 1800);
      });
    },
    'toggle-lang': () => window.L.toggle(),
    'set-lang': el => { window.L.set(el.dataset.lang); accTabKey = 'set'; openAccount(); },
    'set-theme': el => {
      const dark = el.dataset.theme === 'dark';
      try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
      applyTheme(dark);
      $$('[data-action="set-theme"]').forEach(b => b.classList.toggle('on', b === el));
    },
    'show-intro': () => openIntro(true),
    account: () => { accTabKey = 'acct'; openAccount(); },
    'acc-tab': el => {
      accTabKey = el.dataset.pane;
      $$('.acc-tabs button, .acc-pane').forEach(n => n.classList.toggle('on', n.dataset.pane === accTabKey));
    },
    'toggle-theme': () => {
      const dark = !isDark();
      try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
      applyTheme(dark);
    },

    'close-modal': () => closeModal(),
    backdrop: (el, e) => { if (e.target === el && !el.dataset.lock) closeModal(); }
  };

  // Opening a link on a Daily Work card counts as one check (no need to press "Check now").
  const countLinkOpen = e => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const a = e.target.closest && e.target.closest('a.dw-link[data-wid]');
    if (!a) return;
    const w = db.work.find(x => x.id === a.dataset.wid);
    if (!w) return;
    const last = (w.checks || []).slice(-1)[0];
    if (last && Date.now() - new Date(last).getTime() < 3000) return; // ignore double clicks
    if (commit(() => { w.checks = [...(w.checks || []), new Date().toISOString()].slice(-500); })) {
      buzz('success');
      // Re-draw after the browser has opened the link, so the click is not interrupted.
      setTimeout(() => { renderWork(); renderHome(); }, 0);
    }
  };
  document.addEventListener('click', countLinkOpen);
  document.addEventListener('auxclick', countLinkOpen);

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = handlers[el.dataset.action];
    if (fn) fn(el, e);
  });

  /* ------------------------------------------------------------------ */
  /* Splash screen and first-run guide                                   */
  /* ------------------------------------------------------------------ */
  const INTRO_KEY = 'stowhive.intro.v1';
  const introSeen = () => {
    try { return localStorage.getItem(INTRO_KEY) === 'done'; } catch (e) { return false; }
  };
  const markIntroSeen = () => {
    try { localStorage.setItem(INTRO_KEY, 'done'); } catch (e) { /* ignore */ }
  };

  // Hive logo (three hexagons and a check mark). cls is the class prefix used by the animations.
  const hiveSvg = cls => `
    <svg class="${cls}-svg" viewBox="0 0 100 100" aria-hidden="true">
      <polygon class="${cls} h2" points="32.68,40 50,50 50,70 32.68,80 15.36,70 15.36,50"/>
      <polygon class="${cls} h3" points="67.32,40 84.64,50 84.64,70 67.32,80 50,70 50,50"/>
      <polygon class="${cls} h1" points="50,10 67.32,20 67.32,40 50,50 32.68,40 32.68,20"/>
      <path class="${cls}-tick" d="M41 30 L47 36 L59 23"/>
    </svg>`;

  const introSlides = () => [
    {
      title: 'Welcome to {app}',
      text: 'Write down what you need to do. Stowhive keeps it in front of you.',
      art: hiveSvg('ihex') + `
        <div class="pill-row" style="--i:1">
          <span class="pill">${IC('check')} ${esc(tr('Routine'))}</span>
          <span class="pill">${IC('briefcase')} ${esc(tr('Daily Work'))}</span>
          <span class="pill">${IC('doc')} ${esc(tr('Notes'))}</span>
          <span class="pill">${IC('bell')} ${esc(tr('Bills & Dates'))}</span>
        </div>`
    },
    {
      title: 'Start from Home',
      text: 'Home gathers everything that needs you today: bills coming due, your to-dos and habits. Tick them off as you go.',
      art: `
        <div class="mock-card" style="--i:0">
          <div class="mc-row"><div><b>Netflix</b><div class="mc-sub">${esc(tr('Bill'))}</div></div><span class="badge red">${esc(tr('{n}d left', { n: 2 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:1">
          <div class="mc-row"><div><b>${esc(tr('Call the bank'))}</b><div class="mc-sub">${esc(tr('To-do'))}</div></div><span class="badge gray">${esc(tr('{n} to go', { n: 3 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:2">
          <div class="mc-row"><div><b>${esc(tr('Drink water'))}</b><div class="mc-sub">${esc(tr('Habit'))}</div></div></div>
        </div>`
    },
    {
      title: 'Build your day',
      text: 'Use Routine. Tick off habits, keep a to-do list, and write one line about your mood.',
      art: `
        <div class="mock-card" style="--i:0">
          <div class="mc-row"><div><b>${esc(tr('Drink water'))}</b><div class="mc-sub">${esc(tr('Habits'))}</div></div><span class="badge green">${esc(tr('{n} day streak', { n: 5 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:1">
          <div class="mc-row"><div><b>${esc(tr('Call the bank'))}</b><div class="mc-sub">${esc(tr('To-do'))}</div></div><span class="badge gray">${esc(tr('{n} open', { n: 3 }))}</span></div>
        </div>
        <div class="pill-row" style="--i:2"><span class="pill">${esc(tr('Mood & diary'))}</span></div>`
    },
    {
      title: 'Check it every day',
      text: 'Use Daily Work for things you check often, like a dashboard or an inbox. Opening a link counts as one check and keeps the time. The login is saved on the same card.',
      art: `
        <div class="mock-card" style="--i:0">
          <div class="mc-row"><div><b>${esc(tr('Order dashboard'))}</b><div class="mc-sub">${esc(tr('Last checked {t}', { t: '09:30' }))}</div></div><span class="badge green">${esc(tr('\u00d7{n} today', { n: 3 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:1">
          <div class="mc-row"><div><b>${esc(tr('Customer inbox'))}</b><div class="mc-sub">${esc(tr('Not checked yet'))}</div></div><span class="badge gray">${esc(tr('\u00d7{n} today', { n: 0 }))}</span></div>
        </div>`
    },
    {
      title: 'Write it down',
      text: 'Use Notes for quick memos, lists and ideas. Pin the important ones and pick a colour. They save by themselves.',
      art: `
        <div class="mock-card" style="--i:0;background:#fff4c2;color:#1a2b2b">
          <div class="mc-row"><div><b>${esc(tr('Shopping list'))}</b><div class="mc-sub" style="color:#4a5a5a">${esc(tr('Milk, eggs, rice'))}</div></div><span class="badge gray">${esc(tr('Pinned'))}</span></div>
        </div>
        <div class="mock-card" style="--i:1;background:#d9ebff;color:#1a2b2b">
          <div class="mc-row"><div><b>${esc(tr('Weekend trip ideas'))}</b><div class="mc-sub" style="color:#4a5a5a">${esc(tr('Notes'))}</div></div></div>
        </div>`
    },
    {
      title: 'Do not miss a payment',
      text: 'Use Bills & Dates for subscriptions, passport, road tax and insurance. Pick how many days ahead to be reminded, and it shows up on Home. Red = 3 days or less, yellow = within 30 days, green = safe.',
      art: `
        <div class="mock-card" style="--i:0">
          <div class="mc-row"><div><b>Netflix</b><div class="mc-sub">RM 55.00 &middot; ${esc(tr('Monthly'))}</div></div><span class="badge red">${esc(tr('{n}d left', { n: 2 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:1">
          <div class="mc-row"><div><b>${esc(tr('Passport'))}</b><div class="mc-sub">${esc(tr('Renew before it expires'))}</div></div><span class="badge yellow">${esc(tr('{n}d left', { n: 18 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:2">
          <div class="mc-row"><div><b>${esc(tr('Car insurance'))}</b><div class="mc-sub">RM 1,200.00 &middot; ${esc(tr('Yearly'))}</div></div><span class="badge green">${esc(tr('{n}d left', { n: 90 }))}</span></div>
        </div>`
    },
    {
      title: 'Two extras, when you need them',
      text: 'My Items remembers where things are kept and when a warranty ends. Daily Budget shows how much you can spend each day. Both sit lower in the menu.',
      art: `
        <div class="mock-card" style="--i:0">
          <div class="mc-row"><div><b>${esc(tr('Camera'))}</b><div class="mc-tags"><span class="tag loc">${IC('pin')} ${esc(tr('Closet, 2nd shelf'))}</span></div></div><span class="badge green">${esc(tr('In warranty · {n}d', { n: 214 }))}</span></div>
        </div>
        <div class="mock-card" style="--i:1">
          <div class="mc-row"><div><b>${esc(tr('Left this month'))}</b><div class="mc-sub">${esc(tr('RM 1,240 of RM 2,000'))}</div></div><span class="badge green">62%</span></div>
        </div>`
    },
    {
      title: 'Your data, on every device',
      text: 'Saved in this browser first. Tap the profile button to sign in and sync, or export a backup. Never store ID numbers or photos. Tap ? to see this guide again.',
      art: `
        <div class="lock-art" style="--i:0">
          <div class="ring r1"></div><div class="ring r2"></div>
          <div class="lock-core">${IC('lock')}</div>
        </div>
        <div class="pill-row" style="--i:1"><span class="pill">${esc(tr('Sign in to sync'))}</span><span class="pill">${esc(tr('Export a backup'))}</span></div>`
    }
  ];

  function runSplash(done) {
    const el = $('#splash');
    if (!el) { done(); return; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstVisit = !introSeen();
    let finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      el.classList.add('hide');
      setTimeout(() => el.remove(), 500);
      done();
    };
    el.addEventListener('click', end); // tap to skip
    setTimeout(end, reduce ? 700 : (firstVisit ? 2500 : 1500));
  }

  function openIntro(manual) {
    if ($('#intro')) return;
    const INTRO_SLIDES = introSlides(); // rebuilt on every open, so it follows the current language
    const root = document.createElement('div');
    root.id = 'intro';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Welcome guide');
    root.innerHTML = `
      <div class="intro-card">
        <button type="button" class="intro-skip" data-in="skip">${esc(tr('Skip'))}</button>
        <div class="intro-viewport">
          <div class="intro-track">
            ${INTRO_SLIDES.map(s => `
              <section class="intro-slide">
                <div class="intro-art-wrap"><div class="art">${s.art}</div></div>
                <div class="intro-copy"><h2>${esc(tr(s.title, { app: APP_NAME }))}</h2><p>${esc(tr(s.text))}</p></div>
              </section>`).join('')}
          </div>
        </div>
        <div class="intro-dots">
          ${INTRO_SLIDES.map((s, i) => `<button type="button" class="dot" data-in="go" data-i="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('')}
        </div>
        <div class="intro-btns">
          <button type="button" class="btn ghost" data-in="back">${esc(tr('Back'))}</button>
          <button type="button" class="btn primary" data-in="next">${esc(tr('Next'))}</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add('modal-open');

    const track = $('.intro-track', root);
    const slideEls = $$('.intro-slide', root);
    const dots = $$('.dot', root);
    const backBtn = $('[data-in="back"]', root);
    const nextBtn = $('[data-in="next"]', root);
    const skipBtn = $('.intro-skip', root);
    const last = INTRO_SLIDES.length - 1;
    let idx = 0;

    function show(i) {
      idx = Math.max(0, Math.min(last, i));
      track.style.transform = `translateX(${-idx * 100}%)`;
      slideEls.forEach((s, n) => s.classList.toggle('active', n === idx));
      dots.forEach((d, n) => d.classList.toggle('on', n === idx));
      backBtn.classList.toggle('off', idx === 0);
      nextBtn.textContent = idx === last ? tr('Get started') : tr('Next');
      skipBtn.hidden = idx === last;
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      markIntroSeen();
      root.classList.add('closing');
      document.body.classList.remove('modal-open');
      setTimeout(() => root.remove(), 300);
      if (!manual) {
        // Point at the + button so a first-time user knows where to start.
        const fab = ui.tab === 'home' ? null : $('#fab');
        if (fab) {
          fab.classList.add('pulse');
          setTimeout(() => fab.classList.remove('pulse'), 4200);
        }
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
    }
    document.addEventListener('keydown', onKey);

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-in]');
      if (!b) return;
      const act = b.dataset.in;
      if (act === 'skip') close();
      else if (act === 'back') show(idx - 1);
      else if (act === 'next') { if (idx === last) close(); else show(idx + 1); }
      else if (act === 'go') show(Number(b.dataset.i));
    });

    // Swipe left / right on touch screens
    let startX = null;
    root.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    show(0);
    nextBtn.focus({ preventScroll: true });
  }

  // Light vibration on touch for buttons and tappable cards (Android; ignored on iPhone).
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const hit = e.target.closest('.btn, .tile, .nav-btn, .chip-btn, .fab, .subtab, .card-row.tap, .add-tile, .qk-tile, .mood-btn, .sch-check, .icon-btn, .help-btn, .side-acct, .cat-chip, .wk-pick label, .rep-chk, .link-btn, .toast-btn');
    if (hit) buzz(hit.matches('.mood-btn, .cat-chip, .subtab, .chip-btn, .wk-pick label') ? 'select' : 'tap');
  }, { passive: true });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#modal-root').firstChild) closeModal();
  });

  $('#asset-search').addEventListener('input', e => {
    ui.assetQuery = e.target.value;
    renderAssets();
  });

  $('#show-archived').addEventListener('change', e => {
    ui.showArchived = e.target.checked;
    renderRenewals();
  });

  /* ------------------------------------------------------------------ */
  /* Theme (light / dark)                                                */
  /* ------------------------------------------------------------------ */
  const THEME_KEY = 'stowhive.theme';
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const b = $('[data-action="toggle-theme"]');
    if (b) { b.innerHTML = IC(dark ? 'sun' : 'moon'); b.title = tr(dark ? 'Light mode' : 'Dark mode'); }
    const m = $('meta[name="theme-color"]');
    if (m) m.content = dark ? '#0b3f3b' : '#115e59';
  }

  /* ------------------------------------------------------------------ */
  /* Cloud sync with Supabase: one row per user (see supabase.sql)       */
  /* ------------------------------------------------------------------ */
  const MARK_KEY = 'stowhive.synced';
  const Cloud = {
    client: null, user: null, timer: null, state: 'off', msg: '',
    enabled() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase); },
    mark() { try { return localStorage.getItem(MARK_KEY) || ''; } catch (e) { return ''; } },
    setMark() { try { localStorage.setItem(MARK_KEY, `${this.user.id}|${db.updatedAt}`); } catch (e) { /* ignore */ } },
    init() {
      if (!this.enabled()) return;
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.client.auth.onAuthStateChange((ev, session) => {
        const u = session ? session.user : null;
        const prev = this.user && this.user.id;
        this.user = u;
        if (!u) this.state = 'off';
        if (ev === 'PASSWORD_RECOVERY') setTimeout(openNewPassword, 0);
        if (u && u.id !== prev) setTimeout(() => this.pull(), 0); // not inside the callback, to avoid a deadlock
        updateAccountBtn();
      });
    },
    fail(e) { this.state = 'error'; this.msg = (e && e.message) || String(e); toast(tr('Sync failed') + ': ' + this.msg.slice(0, 80), { ms: 5000 }); updateAccountBtn(); },
    schedule() {
      if (!this.user) return;
      this.state = 'pending';
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 1200);
    },
    async push() {
      if (!this.user) return;
      clearTimeout(this.timer);
      this.state = 'sync';
      if (!db.updatedAt) { db.updatedAt = new Date().toISOString(); try { Store.save(db); } catch (e) { /* ignore */ } }
      const { error } = await this.client.from('user_data').upsert({ user_id: this.user.id, data: db, updated_at: new Date().toISOString() });
      if (error) { this.fail(error); return; }
      this.state = 'ok'; this.msg = '';
      this.setMark();
      updateAccountBtn();
    },
    async pull() {
      this.state = 'sync';
      const { data, error } = await this.client.from('user_data').select('data').eq('user_id', this.user.id).maybeSingle();
      if (error) { this.fail(error); return; }
      if (!data) { await this.push(); return; }
      const remote = Store.normalize(data.data);
      if (remote.updatedAt === db.updatedAt) { this.state = 'ok'; this.setMark(); updateAccountBtn(); return; }
      const merged = mergeDb(db, remote);
      const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
      if (!same(merged, db)) {
        db = merged;
        try { Store.save(db); } catch (e) { /* ignore */ }
        renderAll();
        toast('Synced from cloud');
      }
      if (!same(merged, remote)) await this.push();
      else { this.state = 'ok'; this.setMark(); updateAccountBtn(); }
    }
  };

  function updateAccountBtn() {
    const b = $('[data-action="account"]');
    if (b) {
      b.classList.toggle('on', !!Cloud.user);
      b.title = Cloud.user ? tr('Signed in: {email}', { email: Cloud.user.email }) : tr('Account and cloud sync');
    }
    // Sidebar account card (bottom-left on wide screens)
    const nm = $('#sa-name');
    if (nm) {
      const em = Cloud.user && Cloud.user.email;
      $('#sa-av').textContent = em ? em[0].toUpperCase() : '?';
      nm.textContent = em || tr('Not signed in');
      $('#sa-sub').textContent = em ? tr(SYNC_TEXT[Cloud.state] || 'Not synced') : tr('Tap to sign in');
      $('.side-acct').classList.toggle('on', !!em);
    }
  }

  const SYNC_TEXT = { off: 'Not synced', pending: 'Waiting to sync...', sync: 'Syncing...', ok: 'All changes saved to the cloud', error: 'Sync failed' };

  // Shown after the user opens the reset link from the email.
  function openNewPassword() {
    openModal('Set a new password', `
      <form id="np-form">
        ${fInput('New password (6 or more characters)', 'password', 'password', '', 'autocomplete="new-password" minlength="6" required')}
        <p id="np-msg" class="card-sub"></p>
        <button type="submit" class="btn primary block">${esc(tr('Save password'))}</button>
      </form>`, root => {
      $('#np-form', root).addEventListener('submit', async e => {
        e.preventDefault();
        const pw = new FormData(e.target).get('password') || '';
        if (pw.length < 6) { $('#np-msg', root).textContent = tr('Use 6 or more characters.'); return; }
        const { error } = await Cloud.client.auth.updateUser({ password: pw });
        if (error) { $('#np-msg', root).textContent = tr(error.message); return; }
        closeModal();
        toast('Password updated');
      });
    });
  }

  // The account sheet is split into tabs (Account / Settings / Backup) so it is never one long page.
  let accTabKey = 'acct';
  function openAccModal(label, html, onMount) {
    const iS = html.indexOf('<div class="backup settings">');
    const iB = html.indexOf('<div class="backup">');
    const panes = [['acct', tr(label), html.slice(0, iS)], ['set', tr('Settings'), html.slice(iS, iB)], ['bk', tr('Backup'), html.slice(iB)]];
    const wrapped = `<div class="acc-tabs">${panes.map(p => `<button type="button" class="${p[0] === accTabKey ? 'on' : ''}" data-action="acc-tab" data-pane="${p[0]}">${esc(p[1])}</button>`).join('')}</div>
      ${panes.map(p => `<div class="acc-pane ${p[0] === accTabKey ? 'on' : ''}" data-pane="${p[0]}">${p[2]}</div>`).join('')}`;
    openModal(tr('Account'), wrapped, onMount);
  }

  function openAccount() {
    if (!Cloud.enabled()) {
      openAccModal('Account', `<p class="card-sub">${esc(tr('Cloud sync is not set up yet. Your data is saved on this device only. Add SUPABASE_URL and SUPABASE_ANON_KEY at the top of app.js to turn it on.'))}</p>${backupSection()}`, wireBackup);
      return;
    }
    if (Cloud.user) {
      openAccModal('Account', `
        <p class="card-sub">${esc(tr('Signed in as'))} <b>${esc(Cloud.user.email)}</b></p>
        <p class="card-sub">${esc(tr(SYNC_TEXT[Cloud.state] || ''))}${Cloud.msg ? ': ' + esc(tr(Cloud.msg)) : ''}</p>
        <div class="card-actions" style="padding:0">
          <button type="button" class="btn small" data-acc="sync">${esc(tr('Sync now'))}</button>
          <button type="button" class="btn small ghost" data-acc="out">${esc(tr('Sign out'))}</button>
        </div>${backupSection()}`, root => {
        wireBackup(root);
        // Listen on the sheet body (rebuilt on every open) so handlers never pile up.
        $('.sheet-body', root).addEventListener('click', async e => {
          const b = e.target.closest('[data-acc]');
          if (!b) return;
          if (b.dataset.acc === 'sync') { await Cloud.push(); closeModal(); toast(Cloud.state === 'ok' ? 'Synced' : 'Sync failed'); }
          else { await Cloud.client.auth.signOut(); closeModal(); toast('Signed out. Data stays on this device.'); }
        });
      });
      return;
    }
    openAccModal('Sign in', `
      <form id="acc-form" autocomplete="on">
        ${fInput('Email', 'email', 'email', '', 'autocomplete="email" required')}
        ${fInput('Password (6 or more characters)', 'password', 'password', '', 'autocomplete="current-password" minlength="6" required')}
        <p id="acc-msg" class="card-sub"></p>
        <button type="submit" class="btn primary block" data-acc="in">${esc(tr('Sign in'))}</button>
        <button type="button" class="btn ghost block" data-acc="up">${esc(tr('Create account'))}</button>
        <button type="button" class="link-btn" data-acc="forgot">${esc(tr('Forgot password?'))}</button>
      </form>${backupSection()}`, root => {
      wireBackup(root);
      const form = $('#acc-form', root);
      const msg = t => { $('#acc-msg', root).textContent = tr(t); };
      // After sign-up: a clear "go and confirm your email" screen that replaces the form.
      const showSent = (email, again) => {
        const gmail = /@(gmail|googlemail)\.com$/i.test(email);
        const mailUrl = gmail ? 'https://mail.google.com/mail/u/' + encodeURIComponent(email) + '/#search/from%3Asupabase+OR+subject%3Aconfirm' : '';
        form.outerHTML = `
          <div id="acc-sent" class="sent-box">
            <div class="sent-ico">${IC('mail')}</div>
            <h3>${esc(tr('Check your email'))}</h3>
            <p>${esc(tr('We sent a confirmation email to'))}</p>
            <p class="sent-to">${esc(email)}</p>
            <ol class="sent-steps">
              <li>${esc(gmail ? tr('Open your Gmail inbox') : tr('Open your email inbox'))}</li>
              <li>${esc(tr('Tap the button "Confirm my email address"'))}</li>
              <li>${esc(tr('Come back here and sign in'))}</li>
            </ol>
            <p class="sent-tip">${esc(tr('Cannot find it? Check Spam or Promotions. It can take a minute to arrive.'))}</p>
            ${again ? `<p class="sent-tip">${esc(tr('This email may already have an account. Try signing in, or use Forgot password.'))}</p>` : ''}
            ${gmail ? `<a class="btn primary block" href="${mailUrl}" target="_blank" rel="noopener">${esc(tr('Open Gmail'))}</a>` : ''}
            <button type="button" class="btn ghost block" data-acc="back">${esc(tr('Back to sign in'))}</button>
          </div>`;
        $('[data-acc="back"]', root).addEventListener('click', () => openAccount());
      };
      const run = async mode => {
        const f = Object.fromEntries(new FormData(form));
        if (!f.email || !f.password || f.password.length < 6) { msg('Enter an email and a password of 6 or more characters.'); return; }
        msg('Please wait...');
        const auth = Cloud.client.auth;
        if (mode === 'in') {
          const { error } = await auth.signInWithPassword({ email: f.email.trim(), password: f.password });
          if (error) {
            msg(/not confirmed/i.test(error.message) ? tr('Please confirm your email first. Open the email we sent you and tap "Confirm my email address".') : error.message);
            return;
          }
        } else {
          const email = f.email.trim();
          const { data, error } = await auth.signUp({ email, password: f.password, options: { emailRedirectTo: location.href.split('#')[0].split('?')[0], data: { lang: window.L.lang } } });
          if (error) { msg(error.message); return; }
          if (!data.session) {
            // Supabase returns an empty identities list when the address is already registered.
            const exists = !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
            showSent(email, exists);
            return;
          }
        }
        closeModal();
        toast('Signed in');
      };
      form.addEventListener('submit', e => { e.preventDefault(); run('in'); });
      $('[data-acc="up"]', root).addEventListener('click', () => run('up'));
      $('[data-acc="forgot"]', root).addEventListener('click', async () => {
        const email = (form.elements.email.value || '').trim();
        if (!email) { msg('Enter your email first, then tap Forgot password.'); return; }
        msg('Please wait...');
        const { error } = await Cloud.client.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0].split('?')[0] });
        msg(error ? error.message : 'If this email has an account, a reset link is on its way.');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  // Click feel: a ripple from the tap point, a tiny haptic tick on touch screens (the press-down itself is CSS).
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled || b.matches('.dot, .ph-head, .tile-x, .toast-btn')) return;
    if (e.pointerType === 'touch' && navigator.vibrate) { try { navigator.vibrate(6); } catch (x) { /* ignore */ } }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = b.getBoundingClientRect();
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.classList.add('rip-host');
    const d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, { passive: true });

  document.title = APP_NAME;
  $('.top h1').textContent = APP_NAME;
  $('.bottom-nav').dataset.name = APP_NAME;
  applyTheme(isDark());
  window.L.apply();
  renderAll();
  switchTab('home');
  window.L.onChange(() => { const y = window.scrollY; renderAll(); switchTab(ui.tab); window.scrollTo({ top: y }); updateAccountBtn(); });
  Cloud.init();
  // Pick up changes made on another device whenever this tab comes back into view.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    checkNewDay();
    if (Cloud.user && Cloud.state !== 'sync') Cloud.pull();
  });
  updateAccountBtn();
  // Splash first, then the guide on the very first visit.
  runSplash(() => { if (!introSeen()) openIntro(false); });
})();