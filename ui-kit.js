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
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'
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
  var PAL = ['#0f766e', '#f59e0b', '#6366f1', '#ec4899', '#0ea5e9', '#84cc16', '#94a3b8'];
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
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
      + pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.4" fill="var(--primary)"/>'; }).join('') + '</svg>';
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