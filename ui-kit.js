/* Stowhive UI kit: line icons, hive illustrations, small charts. No dependencies.
 * Everything returns HTML/SVG strings, colours come from CSS variables so dark mode just works. */
(function () {
  'use strict';
  var P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l3 3 5-6"/>',
    wallet: '<path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 7l12-4v4"/><circle cx="17" cy="13.5" r="1"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
    food: '<path d="M6 3v8a2 2 0 002 2v8M10 3v6M6 6h4M17 21V3c-2 1-3 4-3 7h3"/>',
    car: '<path d="M5 16v-4l2-5h10l2 5v4M3 16h18M7 19v-3M17 19v-3"/><circle cx="8" cy="13" r=".6"/><circle cx="16" cy="13" r=".6"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    fun: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
    other: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>',
    loop: '<path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M20 4v5h-5M4 20v-5h5"/>',
    id: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    road: '<path d="M8 3L5 21M16 3l3 18M12 4v3M12 10v4M12 17v3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
    cloud: '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    wrench: '<path d="M15 4a4.5 4.5 0 00-4 6L4 17l3 3 7-7a4.5 4.5 0 006-4l-3 3-3-1-1-3z"/>',
    cal: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    hourglass: '<path d="M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18V6H3zM12 6v14M12 6c-2-3-5-3-5-1s3 1 5 1zM12 6c2-3 5-3 5-1s-3 1-5 1z"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4 0-6 1-9z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
  };
  function ic(n) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.other) + '</svg>';
  }

  // Mood faces 1 (rough) .. 5 (great)
  var MOUTH = ['M8 16.5c1.3-2 6.7-2 8 0', 'M8.5 15.8q3.5-1.6 7 0', 'M8.5 15h7', 'M8.5 14q3.5 3 7 0', 'M8 13.5h8q-1 4.2-4 4.2t-4-4.2z'];
  function face(v) {
    v = Math.min(5, Math.max(1, Number(v) || 3));
    return '<svg class="mf mf' + v + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.8" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.8" r="1" fill="currentColor" stroke="none"/><path d="' + MOUTH[v - 1] + '"' + (v === 5 ? ' fill="currentColor" fill-opacity=".25"' : '') + '/></svg>';
  }

  // Empty-state illustration: hive cell + icon + a small bee
  var BEE = '<g transform="translate(70 12) rotate(12)"><ellipse cx="-5" cy="-7" rx="6" ry="4" fill="#fff" stroke="currentColor" stroke-width="1.4" opacity=".9"/><ellipse cx="5" cy="-7" rx="6" ry="4" fill="#fff" stroke="currentColor" stroke-width="1.4" opacity=".9"/><ellipse cx="0" cy="0" rx="8" ry="6" fill="#f5b83d" stroke="currentColor" stroke-width="1.4"/><path d="M-2 -5v10M3 -5v10" stroke="currentColor" stroke-width="2"/></g>';
  function art(n) {
    return '<svg class="hv-art" viewBox="0 0 90 90" aria-hidden="true"><polygon points="45,12 73,28 73,62 45,78 17,62 17,28" fill="var(--primary-soft)" stroke="var(--primary-mid)" stroke-width="2"/>'
      + '<polygon points="45,22 64,33 64,57 45,68 26,57 26,33" fill="none" stroke="var(--primary-mid)" stroke-width="1.2" stroke-dasharray="3 3"/>'
      + '<g transform="translate(33 33) scale(1)" style="color:var(--primary)">' + ic(n).replace('class="ic"', 'class="ic" width="24" height="24"') + '</g>' + BEE + '</svg>';
  }

  // Progress ring. pct 0-100, tone '', 'warn', 'over'. centre = HTML text.
  function ring(pct, tone, centre, size) {
    var r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
    return '<span class="pgr ' + (tone || '') + '" style="width:' + (size || 84) + 'px;height:' + (size || 84) + 'px"><svg viewBox="0 0 100 100"><circle class="rg-t" cx="50" cy="50" r="' + r + '"/><circle class="rg-v" cx="50" cy="50" r="' + r + '" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 50 50)"/></svg><b>' + centre + '</b></span>';
  }

  // Donut: rows = [{v, k}] where k is a palette index
  var PAL = ['#0f766e', '#f59e0b', '#6366f1', '#ec4899', '#0ea5e9', '#84cc16', '#94a3b8', '#ef4444', '#14b8a6', '#a855f7', '#f97316', '#3b82f6'];
  function donut(rows) {
    var tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    if (!tot) return '';
    var r = 36, c = 2 * Math.PI * r, off = 0;
    var seg = rows.map(function (x) {
      var len = x.v / tot * c, s = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + PAL[x.k % PAL.length] + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 50 50)"/>';
      off += len; return s;
    }).join('');
    return '<svg class="donut" viewBox="0 0 100 100" aria-hidden="true">' + seg + '</svg>';
  }

  // Pie (filled circle): rows = [{v, k}] palette index, or [{v, color}] for a fixed colour
  function pie(rows) {
    var tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    if (!tot) return '';
    var r = 25, c = 2 * Math.PI * r, off = 0, gap = rows.length > 1 ? 0.8 : 0;
    var seg = rows.map(function (x) {
      var len = x.v / tot * c, col = x.color || PAL[x.k % PAL.length];
      var o = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="50" stroke-dasharray="' + Math.max(0, len - gap).toFixed(2) + ' ' + (c - Math.max(0, len - gap)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 50 50)"/>';
      off += len; return o;
    }).join('');
    return '<svg class="pie" viewBox="0 0 100 100" aria-hidden="true">' + seg + '</svg>';
  }

  // Heat map: cols = array of weeks, each week = 7 values (0..1 or -1 for none)
  function heat(weeks) {
    return '<div class="heat">' + weeks.map(function (w) {
      return '<div>' + w.map(function (v) { return '<i class="h' + (v < 0 ? 'x' : Math.min(4, Math.ceil(v * 4))) + '"></i>'; }).join('') + '</div>';
    }).join('') + '</div>';
  }

  // Sparkline for values 1-5 (null = gap)
  function spark(vals) {
    var n = vals.length, w = 200, h = 44, pts = [], d = '';
    vals.forEach(function (v, i) {
      if (v == null) return;
      var x = n > 1 ? i / (n - 1) * (w - 8) + 4 : w / 2, y = h - 4 - (v - 1) / 4 * (h - 8);
      pts.push([x, y]); d += (d && vals[i - 1] != null ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    });
    if (!pts.length) return '';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
      + pts.map(function (p) { return '<path d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'h0" stroke="var(--primary)" stroke-width="6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'; }).join('') + '</svg>';
  }

  // Budget plan pie. rows = [{v: limit, sp: spent, k: palette index | color}].
  // A slice's angle is its limit; the solid colour grows out from the centre as more of it is spent.
  // Slices that went over their limit get a red rim.
  function planPie(rows) {
    var tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    if (!tot) return '';
    var R = 47, a = -Math.PI / 2, out = '';
    function pt(r, g) { return (50 + r * Math.cos(g)).toFixed(2) + ' ' + (50 + r * Math.sin(g)).toFixed(2); }
    function shape(r, a0, a1, at) {
      if (a1 - a0 >= Math.PI * 2 - 1e-6) return '<circle cx="50" cy="50" r="' + r.toFixed(2) + '" ' + at + '/>';
      return '<path d="M50 50L' + pt(r, a0) + 'A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + pt(r, a1) + 'Z" ' + at + '/>';
    }
    rows.forEach(function (x) {
      var ang = x.v / tot * Math.PI * 2, col = x.color || PAL[x.k % PAL.length], sp = Math.max(0, x.sp || 0);
      out += shape(R, a, a + ang, 'fill="' + col + '" fill-opacity="' + (x.plain ? 1 : 0.34) + '" stroke="var(--card)" stroke-width="1"');
      if (sp > 0 && !x.plain) out += shape(Math.max(5, R * Math.sqrt(Math.min(1, sp / x.v))), a, a + ang, 'fill="' + col + '" stroke="var(--card)" stroke-width="1"');
      if (sp > x.v && !x.plain) out += shape(R - 1.5, a, a + ang, 'fill="none" stroke="var(--red)" stroke-width="3" stroke-linejoin="round"');
      a += ang;
    });
    return '<svg class="pie" viewBox="0 0 100 100" aria-hidden="true">' + out + '</svg>';
  }

  window.SHI = { planPie: planPie, ic: ic, face: face, art: art, ring: ring, donut: donut, pie: pie, heat: heat, spark: spark, pal: PAL };
  document.querySelectorAll('[data-ic]').forEach(function (el) { el.innerHTML = ic(el.getAttribute('data-ic')); });
})();

/* Bee mouse pointer: desktop only. A small bee follows the mouse, flaps its wings, leans as it moves and flaps faster over things you can click. */
(function () {
  'use strict';
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var SVG = '<svg viewBox="-13 -13 26 26" aria-hidden="true"><g class="bee-b" stroke="#134e4a" stroke-linejoin="round" stroke-linecap="round">'
    + '<ellipse class="bee-w l" cx="-5" cy="-7" rx="6" ry="4" fill="#fff" stroke-width="1.4" opacity=".92"/>'
    + '<ellipse class="bee-w r" cx="5" cy="-7" rx="6" ry="4" fill="#fff" stroke-width="1.4" opacity=".92"/>'
    + '<ellipse cx="0" cy="0" rx="8" ry="6" fill="#f5b83d" stroke-width="1.4"/>'
    + '<path class="bee-sting" d="M-7.5 2.5L-13.5 5.5" stroke-width="1.8" fill="none"/>'
    + '<path d="M-2 -5v10M3 -5v10" stroke-width="2" fill="none"/></g></svg>';
  var HOT = 'a,button,label,summary,select,[data-action],[role="button"],[role="checkbox"],input[type="checkbox"],input[type="radio"],input[type="range"],input[type="date"],input[type="time"],input[type="submit"]';
  var TXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="date"]):not([type="time"]):not([type="submit"]):not([type="button"]),textarea,[contenteditable="true"]';
  var root = document.documentElement, el = document.createElement('div');
  el.id = 'bee-cursor'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = SVG;
  document.body.appendChild(el);
  // The bee only appears over the vent photo (.rage-pic); everywhere else the normal pointer is used.
  var x = 0, y = 0, px = 0, lean = 0, raf = 0, on = false;
  function frame() {
    raf = 0;
    var target = Math.max(-22, Math.min(22, (x - px) * 1.2));
    lean += (target - lean) * 0.25; px = x;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + (12 + lean).toFixed(1) + 'deg)';
    if (on && (Math.abs(target) > 0.1 || Math.abs(lean) > 0.2)) raf = requestAnimationFrame(frame);
  }
  function go() { if (!raf) raf = requestAnimationFrame(frame); }
  function setOn(v) {
    if (v === on) return;
    on = v;
    root.classList.toggle('bee-on', v);
    el.classList.toggle('show', v);
    if (v) { px = x; lean = 0; go(); }
    else { el.classList.remove('sting', 'jab', 'down'); }
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (on) go();
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') { setOn(false); return; }
    if (on) el.classList.add('down');
  }, true);
  document.addEventListener('pointerup', function () { el.classList.remove('down'); }, true);
  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    x = e.clientX; y = e.clientY;
    setOn(!!t.closest('.rage-pic'));
  }, true);
  root.addEventListener('mouseleave', function () { setOn(false); });
})();

/* Vent corner: a photo + name pinned in the sidebar. Hover with the bee, click to sting. Saved on this device only. */
(function () {
  'use strict';
  var box = document.getElementById('rage');
  if (!box) return;
  var KEY = 'stowhive.rage';
  var pic = box.querySelector('.rage-pic'), img = box.querySelector('.rage-img'), marks = box.querySelector('.rage-marks');
  var nameEl = document.getElementById('rage-name'), countEl = document.getElementById('rage-count'), file = document.getElementById('rage-file');
  var tr = function (s, v) { return window.L ? window.L.t(s, v) : s; };
  var st = { name: '', img: '', hits: 0 };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) st = { name: raw.name || '', img: raw.img || '', hits: raw.hits | 0 }; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage full: keep going in memory */ } }
  // Hurt state: the more it is stung, the more it cries and the more lumps swell up on its head.
  // Lumps sit along the top outline of the head (the hexagon's upper edges), clear of the eyes.
  var LUMPS = [[50, 3, 17, -4], [33, 9, 12, 10], [67, 7, 14, -10], [19, 17, 13, -20], [82, 15, 11, 18], [42, 1, 9, 0], [58, 0, 9, 8]];
  var TEARS = [[0, 1], [1, 2], [2, 3]]; // [level, tears per eye]
  var lumps = document.createElement('div'); lumps.className = 'rage-lumps'; lumps.setAttribute('aria-hidden', 'true');
  if (pic.parentNode) pic.parentNode.appendChild(lumps);
  var hurtKey = '', hurtFirst = true, prevN = 0;
  // Kawaii face drawn over the photo (eyes on the left and right sides, blush, small mouth). Changes with the sting count.
  function faceSvg(lv) {
    var D = '#111827', W = '#fff', P = 'rgba(251,113,133,.75)';
    var eyeAt = function (cx, inner) { return '<g transform="translate(' + cx + ' 56)">' + inner + '</g>'; };
    var shine = function (r) { return '<circle cx="' + (-2.6 * r) + '" cy="' + (-2.8 * r) + '" r="' + (2.6 * r) + '" fill="#fff"/><circle cx="' + (2.6 * r) + '" cy="' + (2.6 * r) + '" r="' + (1.3 * r) + '" fill="#fff"/>'; };
    var eyes, mouth, brows = '';
    if (lv === 0) {
      var e0 = '<circle r="7.5" fill="' + D + '" stroke="' + W + '" stroke-width="1.3"/>' + shine(1);
      eyes = eyeAt(25, e0) + eyeAt(75, e0);
      mouth = '<path d="M44 80 Q50 85 56 80" fill="none" stroke="' + W + '" stroke-width="1.8" stroke-linecap="round"/>';
    } else if (lv === 1) {
      var e1 = '<circle r="9" fill="#7dd3fc" stroke="' + W + '" stroke-width="1.3"/><circle cy="-1.4" r="7.6" fill="' + D + '"/>' + shine(1.15);
      eyes = eyeAt(25, e1) + eyeAt(75, e1);
      brows = '<path d="M14 42 L31 36 M69 36 L86 42" stroke="' + W + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
      mouth = '<path d="M43 83 Q46.5 78 50 83 T57 83" fill="none" stroke="' + W + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (lv === 2) {
      var chev = function (s) { var p = (-6 * s) + ',-7 ' + (5 * s) + ',0 ' + (-6 * s) + ',7'; return '<polyline points="' + p + '" fill="none" stroke="' + D + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="' + p + '" fill="none" stroke="' + W + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'; };
      eyes = eyeAt(25, chev(1)) + eyeAt(75, chev(-1));
      brows = '<path d="M14 40 L31 34 M69 34 L86 40" stroke="' + W + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
      mouth = '<path d="M43 85 Q50 77 57 85" fill="none" stroke="' + W + '" stroke-width="2" stroke-linecap="round"/>';
    } else {
      var sw = '<path d="M8 0 A8 8 0 1 1 -8 0 A6 6 0 1 1 4 0 A3 3 0 1 1 -2 0" fill="none" stroke="' + D + '" stroke-width="4.4" stroke-linecap="round"/><path d="M8 0 A8 8 0 1 1 -8 0 A6 6 0 1 1 4 0 A3 3 0 1 1 -2 0" fill="none" stroke="' + W + '" stroke-width="2" stroke-linecap="round"/>';
      eyes = eyeAt(25, sw) + eyeAt(75, sw);
      brows = '<path d="M14 40 L31 34 M69 34 L86 40" stroke="' + W + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
      mouth = '<ellipse cx="50" cy="84" rx="6" ry="7.5" fill="' + D + '" stroke="' + W + '" stroke-width="1.5"/><ellipse cx="50" cy="88" rx="3.4" ry="2.6" fill="#fb7185"/>';
    }
    var blush = '<ellipse cx="14" cy="70" rx="7" ry="4.5" fill="' + P + '"/><ellipse cx="86" cy="70" rx="7" ry="4.5" fill="' + P + '"/>';
    return '<svg class="rage-face" viewBox="0 0 100 116" aria-hidden="true">' + blush + brows + eyes + mouth + '</svg>';
  }
  function hurt() {
    var h = st.hits, on = !!st.img;
    var n = on ? Math.min(LUMPS.length, Math.floor(h / 7)) : 0;
    var lv = !on ? 0 : h >= 80 ? 3 : h >= 30 ? 2 : h >= 10 ? 1 : 0;
    box.style.setProperty('--swell', on ? Math.min(1, h / 150).toFixed(3) : '0');
    box.setAttribute('data-hurt', String(lv));
    var eyes = on, key = n + '|' + lv + '|' + on + '|' + eyes;
    if (key === hurtKey) return;
    hurtKey = key;
    var html = '';
    if (eyes) html += faceSvg(lv);
    for (var i = 0; i < n; i++) {
      var L = LUMPS[i], grow = 1 + Math.min(1, h / 150) * 0.2;
      html += '<i class="rage-lump' + (!hurtFirst && i >= prevN ? ' new' : '') + '" style="left:' + L[0] + '%;top:' + L[1] + '%;width:' + (L[2] * grow).toFixed(1) + '%;rotate:' + L[3] + 'deg"></i>';
    }
    if (lv > 0) {
      var per = TEARS[lv - 1][1];
      [25, 75].forEach(function (ex) {
        for (var t = 0; t < per; t++) {
          html += '<b class="rage-tear" style="left:' + ex + '%;animation-duration:' + (2.4 - lv * 0.55).toFixed(2) + 's;animation-delay:' + (-(t * (2.4 - lv * 0.55)) / per - (ex > 50 ? 0.4 : 0)).toFixed(2) + 's"></b>';
        }
      });
    }
    lumps.innerHTML = html;
    prevN = n; hurtFirst = false;
  }
  function paint() {
    nameEl.value = st.name;
    if (st.img) { img.src = st.img; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
    pic.classList.toggle('has-img', !!st.img);
    pic.title = st.img ? '' : tr('Tap to add a photo');
    countEl.textContent = st.hits === 1 ? tr('Stung 1 time') : tr('Stung {n} times', { n: st.hits });
    hurt();
  }
  function bee() { return document.getElementById('bee-cursor'); }
  function restart(el, cls, ms) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // Resize the picked photo to a small cover-cropped JPEG so it stays light in storage
  function loadPhoto(f) {
    if (!f || !/^image\//.test(f.type)) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var W = 180, H = 208, c = document.createElement('canvas'); c.width = W; c.height = H;
        var k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k;
        var ctx = c.getContext('2d'); ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        st.img = c.toDataURL('image/jpeg', 0.85); save(); paint();
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  }

  var BEE = '<svg viewBox="-13 -13 26 26" aria-hidden="true"><g stroke="#134e4a" stroke-linejoin="round" stroke-linecap="round">'
    + '<ellipse class="bee-w l" cx="-5" cy="-7" rx="6" ry="4" fill="#fff" stroke-width="1.4" opacity=".92"/>'
    + '<ellipse class="bee-w r" cx="5" cy="-7" rx="6" ry="4" fill="#fff" stroke-width="1.4" opacity=".92"/>'
    + '<ellipse cx="0" cy="0" rx="8" ry="6" fill="#f5b83d" stroke-width="1.4"/>'
    + '<path class="bee-sting" d="M-7.5 2.5L-13.5 5.5" stroke-width="1.8" fill="none"/>'
    + '<path d="M-2 -5v10M3 -5v10" stroke-width="2" fill="none"/></g></svg>';
  var FLY = 520; // ms the bee needs to reach the photo on touch screens
  // Touch screens have no mouse bee: a bee flies in from the side, stings, and leaves
  function fly(px, py) {
    var f = document.createElement('div'); f.className = 'rage-fly'; f.innerHTML = BEE; document.body.appendChild(f);
    var side = Math.random() < 0.5 ? -1 : 1, sx = px + side * (130 + Math.random() * 60), sy = py - 150 - Math.random() * 60;
    var T = function (x, y, r, s) { return 'translate(' + x + 'px,' + y + 'px) rotate(' + r + 'deg) scale(' + s + ')'; };
    var an = f.animate([
      { transform: T(sx, sy, 20, 1), opacity: 0, offset: 0 },
      { transform: T(sx + (px - sx) * 0.3, sy + (py - sy) * 0.3 - 20, 5, 1), opacity: 1, offset: 0.15 },
      { transform: T(px, py, 12, 1.3), opacity: 1, offset: 0.58 },
      { transform: T(px, py, -12, 1.5), opacity: 1, offset: 0.66 },
      { transform: T(px + side * 10, py, 12, 1.25), opacity: 1, offset: 0.8 },
      { transform: T(px - side * 20, py - 140, 20, 1), opacity: 0, offset: 1 }
    ], { duration: 950, easing: 'ease-in-out' });
    an.onfinish = function () { if (f.parentNode) f.parentNode.removeChild(f); };
  }
  var mouse = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)');

  function sting(e) {
    if (!st.img) { file.click(); return; }
    var r = pic.getBoundingClientRect(), x, y;
    if (e && e.detail > 0) { x = e.clientX - r.left; y = e.clientY - r.top; }
    else { x = r.width * (0.3 + Math.random() * 0.4); y = r.height * (0.3 + Math.random() * 0.4); } // keyboard press
    var vx = r.left + x, vy = r.top + y;
    if (mouse && mouse.matches) impact(x, y);
    else { fly(vx, vy); setTimeout(function () { impact(x, y); }, FLY); }
  }

  function impact(x, y) {
    var r = pic.getBoundingClientRect(), br = box.getBoundingClientRect();
    restart(pic.parentNode || pic, 'jolt', 440); // the whole head (photo, face, lumps) bounces together
    var b = bee(); if (b) restart(b, 'jab', 280);
    // red bump where the stinger landed (keep at most 8 on screen)
    var bump = document.createElement('i'), sz = 14 + Math.random() * 8;
    bump.className = 'rage-bump'; bump.style.cssText = 'left:' + (x - 3) + 'px;top:' + (y - 3) + 'px;width:' + sz + 'px;height:' + sz + 'px';
    marks.appendChild(bump);
    while (marks.children.length > 8) marks.removeChild(marks.firstChild);
    setTimeout(function () { if (bump.parentNode) bump.parentNode.removeChild(bump); }, 2500);
    // floating "-1"
    var pop = document.createElement('span');
    pop.className = 'rage-pop'; pop.textContent = Math.random() < 0.25 ? tr('Ouch!') : '-1';
    pop.style.left = (r.left - br.left + x - 8) + 'px'; pop.style.top = (r.top - br.top + y - 14) + 'px';
    box.appendChild(pop);
    setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 950);
    st.hits++; save(); paint();
  }

  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-rage]');
    if (!t) return;
    var a = t.getAttribute('data-rage');
    if (a === 'hit') sting(e);
    else if (a === 'photo') file.click();
    else if (a === 'reset') { st.hits = 0; save(); paint(); }
  });
  file.addEventListener('change', function () { loadPhoto(file.files && file.files[0]); file.value = ''; });
  nameEl.addEventListener('input', function () { st.name = nameEl.value; save(); });
  nameEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') nameEl.blur(); });

  // The bee shows its stinger while it hovers the photo
  pic.addEventListener('pointerenter', function (e) { var b = bee(); if (b && st.img && (!e.pointerType || e.pointerType === 'mouse')) b.classList.add('sting'); });
  pic.addEventListener('pointerleave', function () { var b = bee(); if (b) b.classList.remove('sting'); });

  var wide = window.matchMedia('(min-width: 900px)'), nav = document.querySelector('.bottom-nav'), home = document.getElementById('view-home');
  function place() {
    if (wide.matches) { if (nav && box.parentNode !== nav) nav.insertBefore(box, nav.querySelector('.side-acct')); }
    else if (home && box.parentNode !== home) home.insertBefore(box, home.firstChild);
  }
  place();
  if (wide.addEventListener) wide.addEventListener('change', place); else if (wide.addListener) wide.addListener(place);

  if (window.L && window.L.onChange) window.L.onChange(paint);
  paint();
})();

/* Smooth light/dark and language switch: cross-fade the whole page instead of snapping. Runs before app.js handles the click. */
(function () {
  'use strict';
  var busy = false, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-action="toggle-theme"], [data-action="toggle-lang"]');
    if (!b || busy || reduce) return;
    var root = document.documentElement;
    if (document.startViewTransition) {
      e.stopImmediatePropagation(); busy = true;
      var vt = document.startViewTransition(function () { b.click(); });
      vt.finished.then(function () { busy = false; }, function () { busy = false; });
    } else if (b.getAttribute('data-action') === 'toggle-theme') {
      root.classList.add('theme-fade');
      setTimeout(function () { root.classList.remove('theme-fade'); }, 650);
    }
  }, true);
})();