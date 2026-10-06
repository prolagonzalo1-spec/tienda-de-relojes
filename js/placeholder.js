/* ==========================================================================
   Placeholders procedurales
   Mientras no existan las fotos reales (assets/[marca]/[modelo]/0X.webp),
   se dibuja un reloj en SVG con los colores definidos en data.json
   (palette.dial, palette.metal, palette.strap, palette.strapColor).
   En cuanto se agrega el archivo real, se usa automáticamente.
   ========================================================================== */

(function () {
  'use strict';

  var METALS = {
    steel:    ['#f1f2f2', '#b9bcbe', '#5d6063'],
    platinum: ['#f4f3ef', '#cfcdc6', '#6e6c66'],
    titanium: ['#c9cbcc', '#8b8f92', '#3e4144'],
    gold:     ['#f6dfa3', '#c9a35c', '#6b4f1d'],
    rose:     ['#f5d0bd', '#c78f74', '#6a3f2c']
  };

  var VARIANTS = ['front', 'dial', 'case', 'movement', 'bracelet', 'detail'];

  var cache = {};
  var uid = 0;

  function rad(deg) { return (deg - 90) * Math.PI / 180; }
  function px(cx, r, deg) { return (cx + r * Math.cos(rad(deg))).toFixed(2); }
  function py(cy, r, deg) { return (cy + r * Math.sin(rad(deg))).toFixed(2); }

  function luminance(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  function shade(hex, amt) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  function gearPath(cx, cy, r, teeth, depth) {
    var d = '', n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * 360, a1 = (i + 1) / n * 360;
      var rr = i % 2 ? r - depth : r;
      d += (i ? 'L' : 'M') + px(cx, rr, a0) + ' ' + py(cy, rr, a0) + 'L' + px(cx, rr, a1) + ' ' + py(cy, rr, a1);
    }
    return d + 'Z';
  }

  function defs(p, id) {
    var m = p.m;
    return '' +
      '<defs>' +
        '<radialGradient id="bg' + id + '" cx="50%" cy="46%" r="70%">' +
          '<stop offset="0" stop-color="#1c1b19"/><stop offset="0.55" stop-color="#0c0c0b"/><stop offset="1" stop-color="#050505"/>' +
        '</radialGradient>' +
        '<linearGradient id="mt' + id + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + m[0] + '"/><stop offset="0.45" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[2] + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="mr' + id + '" x1="1" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + m[0] + '"/><stop offset="0.5" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[2] + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="dl' + id + '" cx="42%" cy="38%" r="75%">' +
          '<stop offset="0" stop-color="' + shade(p.dial, 0.16) + '"/><stop offset="1" stop-color="' + shade(p.dial, -0.35) + '"/>' +
        '</radialGradient>' +
        '<linearGradient id="st' + id + '" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="' + shade(p.strapColor, -0.4) + '"/><stop offset="0.5" stop-color="' + shade(p.strapColor, 0.12) + '"/><stop offset="1" stop-color="' + shade(p.strapColor, -0.4) + '"/>' +
        '</linearGradient>' +
        '<filter id="sh' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>' +
        '<filter id="sf' + id + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>' +
      '</defs>';
  }

  /* ---------- Reloj de frente ---------- */

  function strapFront(p, id, cx, cy) {
    var s = '';
    if (p.strap === 'bracelet') {
      for (var dir = -1; dir <= 1; dir += 2) {
        for (var j = 0; j < 7; j++) {
          var y = dir < 0 ? cy - 214 - j * 62 : cy + 172 + j * 62;
          var w = 150 - j * 2;
          s += '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + (w * 0.3) + '" height="56" rx="6" fill="url(#mt' + id + ')" opacity="0.85"/>';
          s += '<rect x="' + (cx - w * 0.17) + '" y="' + y + '" width="' + (w * 0.34) + '" height="56" rx="8" fill="url(#mr' + id + ')"/>';
          s += '<rect x="' + (cx + w * 0.2) + '" y="' + y + '" width="' + (w * 0.3) + '" height="56" rx="6" fill="url(#mt' + id + ')" opacity="0.85"/>';
        }
      }
    } else {
      s += '<path d="M' + (cx - 78) + ' ' + (cy - 150) + 'L' + (cx - 70) + ' -20L' + (cx + 70) + ' -20L' + (cx + 78) + ' ' + (cy - 150) + 'Z" fill="url(#st' + id + ')"/>';
      s += '<path d="M' + (cx - 78) + ' ' + (cy + 150) + 'L' + (cx - 70) + ' 1020L' + (cx + 70) + ' 1020L' + (cx + 78) + ' ' + (cy + 150) + 'Z" fill="url(#st' + id + ')"/>';
      var stitch = 'stroke="' + shade(p.strapColor, 0.35) + '" stroke-width="1.2" stroke-dasharray="6 6" opacity="0.6"';
      s += '<path d="M' + (cx - 66) + ' ' + (cy - 160) + 'L' + (cx - 60) + ' -20M' + (cx + 66) + ' ' + (cy - 160) + 'L' + (cx + 60) + ' -20" ' + stitch + '/>';
      s += '<path d="M' + (cx - 66) + ' ' + (cy + 160) + 'L' + (cx - 60) + ' 1020M' + (cx + 66) + ' ' + (cy + 160) + 'L' + (cx + 60) + ' 1020" ' + stitch + '/>';
    }
    return s;
  }

  function watchFront(p, id, cx, cy) {
    var s = '';
    var light = luminance(p.dial) > 0.55;
    var ink = light ? '#1d1c1a' : p.m[0];
    var markColor = light ? p.m[2] : p.m[0];

    // sombra
    s += '<ellipse cx="' + cx + '" cy="' + (cy + 40) + '" rx="210" ry="220" fill="#161613" opacity="0.7" filter="url(#sh' + id + ')"/>';
    s += strapFront(p, id, cx, cy);

    // asas
    var lug = 'fill="url(#mt' + id + ')"';
    s += '<path d="M' + (cx - 120) + ' ' + (cy - 150) + 'Q' + (cx - 112) + ' ' + (cy - 215) + ' ' + (cx - 92) + ' ' + (cy - 222) + 'L' + (cx - 70) + ' ' + (cy - 218) + 'L' + (cx - 72) + ' ' + (cy - 160) + 'Z" ' + lug + '/>';
    s += '<path d="M' + (cx + 120) + ' ' + (cy - 150) + 'Q' + (cx + 112) + ' ' + (cy - 215) + ' ' + (cx + 92) + ' ' + (cy - 222) + 'L' + (cx + 70) + ' ' + (cy - 218) + 'L' + (cx + 72) + ' ' + (cy - 160) + 'Z" ' + lug + '/>';
    s += '<path d="M' + (cx - 120) + ' ' + (cy + 150) + 'Q' + (cx - 112) + ' ' + (cy + 215) + ' ' + (cx - 92) + ' ' + (cy + 222) + 'L' + (cx - 70) + ' ' + (cy + 218) + 'L' + (cx - 72) + ' ' + (cy + 160) + 'Z" ' + lug + '/>';
    s += '<path d="M' + (cx + 120) + ' ' + (cy + 150) + 'Q' + (cx + 112) + ' ' + (cy + 215) + ' ' + (cx + 92) + ' ' + (cy + 222) + 'L' + (cx + 70) + ' ' + (cy + 218) + 'L' + (cx + 72) + ' ' + (cy + 160) + 'Z" ' + lug + '/>';

    // corona
    s += '<rect x="' + (cx + 182) + '" y="' + (cy - 17) + '" width="26" height="34" rx="5" fill="url(#mr' + id + ')"/>';
    for (var k = 0; k < 6; k++) s += '<line x1="' + (cx + 186 + k * 4) + '" y1="' + (cy - 15) + '" x2="' + (cx + 186 + k * 4) + '" y2="' + (cy + 15) + '" stroke="' + p.m[2] + '" stroke-width="0.8" opacity="0.7"/>';

    // caja y bisel
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="188" fill="url(#mt' + id + ')"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="176" fill="url(#mr' + id + ')"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="164" fill="' + p.m[2] + '" opacity="0.5"/>';
    // esfera
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="158" fill="url(#dl' + id + ')"/>';

    // pista de minutos
    for (var i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      var a = i * 6;
      s += '<line x1="' + px(cx, 150, a) + '" y1="' + py(cy, 150, a) + '" x2="' + px(cx, 143, a) + '" y2="' + py(cy, 143, a) + '" stroke="' + ink + '" stroke-width="1" opacity="0.55"/>';
    }
    // índices
    for (var h = 0; h < 12; h++) {
      var deg = h * 30;
      var len = h === 0 ? 30 : 24;
      var wdt = h === 0 ? 4 : 5;
      var off = h === 0 ? [-5, 5] : [0];
      for (var o = 0; o < off.length; o++) {
        s += '<g transform="rotate(' + deg + ' ' + cx + ' ' + cy + ')">' +
          '<rect x="' + (cx - wdt / 2 + off[o]) + '" y="' + (cy - 146) + '" width="' + wdt + '" height="' + len + '" rx="1" fill="' + markColor + '"/>' +
          '</g>';
      }
    }
    // marca
    s += '<text x="' + cx + '" y="' + (cy - 70) + '" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="13" letter-spacing="4" fill="' + ink + '" opacity="0.85">' + p.label + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 92) + '" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="7.5" letter-spacing="3" fill="' + ink + '" opacity="0.5">SWISS MADE</text>';
    // subesfera
    s += '<circle cx="' + cx + '" cy="' + (cy + 56) + '" r="26" fill="none" stroke="' + ink + '" stroke-width="0.8" opacity="0.4"/>';

    // agujas (10:10:35)
    s += '<g transform="rotate(-55 ' + cx + ' ' + cy + ')"><path d="M' + cx + ' ' + (cy - 92) + 'L' + (cx + 7) + ' ' + (cy - 10) + 'L' + cx + ' ' + (cy + 18) + 'L' + (cx - 7) + ' ' + (cy - 10) + 'Z" fill="' + markColor + '"/></g>';
    s += '<g transform="rotate(60 ' + cx + ' ' + cy + ')"><path d="M' + cx + ' ' + (cy - 138) + 'L' + (cx + 5.5) + ' ' + (cy - 10) + 'L' + cx + ' ' + (cy + 22) + 'L' + (cx - 5.5) + ' ' + (cy - 10) + 'Z" fill="' + markColor + '"/></g>';
    s += '<g transform="rotate(210 ' + cx + ' ' + cy + ')"><line x1="' + cx + '" y1="' + (cy + 30) + '" x2="' + cx + '" y2="' + (cy - 146) + '" stroke="' + p.accent + '" stroke-width="1.4"/></g>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + markColor + '"/><circle cx="' + cx + '" cy="' + cy + '" r="2.2" fill="' + p.accent + '"/>';

    // reflejo del cristal
    s += '<path d="M' + (cx - 140) + ' ' + (cy - 40) + 'A158 158 0 0 1 ' + (cx + 60) + ' ' + (cy - 146) + 'A190 190 0 0 0 ' + (cx - 140) + ' ' + (cy - 40) + 'Z" fill="#fff" opacity="0.06"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="158" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="1"/>';
    return s;
  }

  /* ---------- Caja de perfil ---------- */

  function watchCase(p, id) {
    var s = '';
    var cx = 400, cy = 500;
    s += '<ellipse cx="' + cx + '" cy="' + (cy + 110) + '" rx="300" ry="40" fill="#161613" opacity="0.8" filter="url(#sh' + id + ')"/>';
    // correa
    if (p.strap === 'bracelet') {
      for (var j = 0; j < 4; j++) {
        s += '<rect x="' + (120 - j * 66) + '" y="' + (cy + 20 + j * 34) + '" width="60" height="44" rx="6" fill="url(#mt' + id + ')" transform="rotate(' + (18 + j * 8) + ' ' + (150 - j * 66) + ' ' + (cy + 40 + j * 34) + ')"/>';
        s += '<rect x="' + (620 + j * 66) + '" y="' + (cy + 20 + j * 34) + '" width="60" height="44" rx="6" fill="url(#mr' + id + ')" transform="rotate(' + (-18 - j * 8) + ' ' + (650 + j * 66) + ' ' + (cy + 40 + j * 34) + ')"/>';
      }
    } else {
      s += '<path d="M190 ' + (cy + 10) + 'C120 ' + (cy + 30) + ' 60 ' + (cy + 120) + ' 20 ' + (cy + 260) + 'L-20 ' + (cy + 240) + 'C30 ' + (cy + 90) + ' 100 ' + (cy - 10) + ' 190 ' + (cy - 30) + 'Z" fill="url(#st' + id + ')"/>';
      s += '<path d="M610 ' + (cy + 10) + 'C680 ' + (cy + 30) + ' 740 ' + (cy + 120) + ' 780 ' + (cy + 260) + 'L820 ' + (cy + 240) + 'C770 ' + (cy + 90) + ' 700 ' + (cy - 10) + ' 610 ' + (cy - 30) + 'Z" fill="url(#st' + id + ')"/>';
    }
    // asas
    s += '<path d="M200 ' + (cy - 40) + 'C160 ' + (cy - 30) + ' 150 ' + (cy + 30) + ' 160 ' + (cy + 60) + 'L215 ' + (cy + 40) + 'Z" fill="url(#mt' + id + ')"/>';
    s += '<path d="M600 ' + (cy - 40) + 'C640 ' + (cy - 30) + ' 650 ' + (cy + 30) + ' 640 ' + (cy + 60) + 'L585 ' + (cy + 40) + 'Z" fill="url(#mr' + id + ')"/>';
    // carrura
    s += '<rect x="190" y="' + (cy - 50) + '" width="420" height="96" rx="38" fill="url(#mt' + id + ')"/>';
    s += '<rect x="190" y="' + (cy - 10) + '" width="420" height="2" fill="#fff" opacity="0.25"/>';
    // fondo
    s += '<rect x="240" y="' + (cy + 30) + '" width="320" height="34" rx="16" fill="url(#mr' + id + ')"/>';
    // bisel
    s += '<rect x="212" y="' + (cy - 82) + '" width="376" height="40" rx="18" fill="url(#mr' + id + ')"/>';
    // cristal
    s += '<path d="M236 ' + (cy - 82) + 'Q400 ' + (cy - 132) + ' 564 ' + (cy - 82) + 'Z" fill="#fff" opacity="0.10"/>';
    s += '<path d="M236 ' + (cy - 82) + 'Q400 ' + (cy - 132) + ' 564 ' + (cy - 82) + '" fill="none" stroke="#fff" stroke-opacity="0.25"/>';
    // corona
    s += '<rect x="606" y="' + (cy - 26) + '" width="44" height="44" rx="8" fill="url(#mr' + id + ')"/>';
    for (var k = 0; k < 9; k++) s += '<line x1="' + (612 + k * 4.5) + '" y1="' + (cy - 24) + '" x2="' + (612 + k * 4.5) + '" y2="' + (cy + 16) + '" stroke="' + p.m[2] + '" stroke-width="1" opacity="0.6"/>';
    // línea de luz
    s += '<rect x="230" y="' + (cy - 44) + '" width="340" height="6" rx="3" fill="#fff" opacity="0.18" filter="url(#sf' + id + ')"/>';
    return s;
  }

  /* ---------- Movimiento ---------- */

  function watchMovement(p, id) {
    var s = '', cx = 400, cy = 500;
    var plate = shade(p.m[1], -0.55);
    var bridge = p.m[1];
    s += '<ellipse cx="' + cx + '" cy="' + (cy + 30) + '" rx="260" ry="260" fill="#161613" opacity="0.8" filter="url(#sh' + id + ')"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="250" fill="url(#mt' + id + ')"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="236" fill="' + plate + '"/>';
    // perlado
    for (var gx = -220; gx <= 220; gx += 26) {
      for (var gy = -220; gy <= 220; gy += 26) {
        if (gx * gx + gy * gy < 225 * 225) s += '<circle cx="' + (cx + gx) + '" cy="' + (cy + gy) + '" r="13" fill="none" stroke="#fff" stroke-opacity="0.05"/>';
      }
    }
    // rotor con Côtes de Genève
    var rotor = 'M' + cx + ' ' + cy + 'L' + px(cx, 228, 200) + ' ' + py(cy, 228, 200) + 'A228 228 0 0 1 ' + px(cx, 228, 340) + ' ' + py(cy, 228, 340) + 'Z';
    s += '<clipPath id="rc' + id + '"><path d="' + rotor + '"/></clipPath>';
    s += '<path d="' + rotor + '" fill="url(#mr' + id + ')" opacity="0.92"/>';
    s += '<g clip-path="url(#rc' + id + ')">';
    for (var x = 160; x < 660; x += 24) s += '<rect x="' + x + '" y="240" width="12" height="270" fill="#fff" opacity="0.08" transform="rotate(25 400 500)"/>';
    s += '</g>';
    s += '<text x="' + cx + '" y="' + (cy - 150) + '" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="13" letter-spacing="4" fill="' + p.m[2] + '">' + p.label + '</text>';
    // puentes
    s += '<path d="M' + (cx - 40) + ' ' + (cy + 30) + 'L' + (cx + 170) + ' ' + (cy + 40) + 'Q' + (cx + 200) + ' ' + (cy + 90) + ' ' + (cx + 150) + ' ' + (cy + 120) + 'L' + (cx - 30) + ' ' + (cy + 110) + 'Z" fill="url(#mt' + id + ')"/>';
    s += '<path d="M' + (cx - 200) + ' ' + (cy + 60) + 'L' + (cx - 60) + ' ' + (cy + 20) + 'L' + (cx - 70) + ' ' + (cy + 170) + 'Q' + (cx - 150) + ' ' + (cy + 170) + ' ' + (cx - 200) + ' ' + (cy + 60) + 'Z" fill="url(#mr' + id + ')"/>';
    // engranajes
    s += '<path d="' + gearPath(cx + 40, cy + 170, 60, 36, 5) + '" fill="' + bridge + '" opacity="0.9"/>';
    s += '<circle cx="' + (cx + 40) + '" cy="' + (cy + 170) + '" r="40" fill="' + plate + '"/>';
    s += '<path d="' + gearPath(cx + 120, cy - 40, 34, 22, 4) + '" fill="' + bridge + '" opacity="0.85"/>';
    // volante
    var bx = cx - 120, by = cy - 60;
    s += '<circle cx="' + bx + '" cy="' + by + '" r="58" fill="none" stroke="' + bridge + '" stroke-width="7"/>';
    for (var sp = 0; sp < 3; sp++) s += '<line x1="' + bx + '" y1="' + by + '" x2="' + px(bx, 56, sp * 120 + 15) + '" y2="' + py(by, 56, sp * 120 + 15) + '" stroke="' + bridge + '" stroke-width="3"/>';
    var spiral = 'M' + bx + ' ' + by;
    for (var t = 0; t < 360 * 5; t += 15) { var rr = 6 + t / 50; spiral += 'L' + px(bx, rr, t) + ' ' + py(by, rr, t); }
    s += '<path d="' + spiral + '" fill="none" stroke="#3a5a9a" stroke-width="0.8" opacity="0.8"/>';
    // rubíes y tornillos azulados
    var jewels = [[bx, by], [cx + 40, cy + 170], [cx + 120, cy - 40], [cx + 150, cy + 80], [cx - 130, cy + 110], [cx, cy + 70]];
    jewels.forEach(function (j) {
      s += '<circle cx="' + j[0] + '" cy="' + j[1] + '" r="7" fill="' + p.m[0] + '"/><circle cx="' + j[0] + '" cy="' + j[1] + '" r="4.5" fill="#8f1730"/><circle cx="' + (j[0] - 1.5) + '" cy="' + (j[1] - 1.5) + '" r="1.4" fill="#ffb3c0"/>';
    });
    var screws = [[cx + 160, cy + 60], [cx - 20, cy + 95], [cx - 185, cy + 70], [cx - 90, cy + 150], [cx + 90, cy + 110]];
    screws.forEach(function (sc, i) {
      s += '<circle cx="' + sc[0] + '" cy="' + sc[1] + '" r="7" fill="#1f3c7a"/><line x1="' + (sc[0] - 6) + '" y1="' + sc[1] + '" x2="' + (sc[0] + 6) + '" y2="' + sc[1] + '" stroke="#0b1530" stroke-width="1.6" transform="rotate(' + (i * 37) + ' ' + sc[0] + ' ' + sc[1] + ')"/>';
    });
    return s;
  }

  /* ---------- Malla / correa ---------- */

  function watchBracelet(p, id) {
    var s = '', cx = 400;
    s += '<g transform="rotate(-14 400 500)">';
    s += '<rect x="' + (cx - 110) + '" y="-80" width="220" height="1160" fill="#161613" opacity="0.6" filter="url(#sh' + id + ')"/>';
    if (p.strap === 'bracelet') {
      for (var j = 0; j < 17; j++) {
        var y = -60 + j * 68;
        s += '<rect x="' + (cx - 96) + '" y="' + y + '" width="60" height="62" rx="7" fill="url(#mt' + id + ')"/>';
        s += '<rect x="' + (cx - 32) + '" y="' + y + '" width="64" height="62" rx="9" fill="url(#mr' + id + ')"/>';
        s += '<rect x="' + (cx + 36) + '" y="' + y + '" width="60" height="62" rx="7" fill="url(#mt' + id + ')"/>';
        s += '<rect x="' + (cx - 26) + '" y="' + (y + 6) + '" width="52" height="4" rx="2" fill="#fff" opacity="0.35"/>';
        for (var b = 0; b < 8; b++) s += '<line x1="' + (cx - 90) + '" y1="' + (y + 8 + b * 6) + '" x2="' + (cx - 42) + '" y2="' + (y + 8 + b * 6) + '" stroke="#fff" stroke-opacity="0.06"/>';
      }
      // cierre
      s += '<rect x="' + (cx - 100) + '" y="460" width="200" height="90" rx="10" fill="url(#mr' + id + ')"/>';
      s += '<text x="' + cx + '" y="512" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="12" letter-spacing="4" fill="' + p.m[2] + '">' + p.label + '</text>';
    } else {
      s += '<rect x="' + (cx - 90) + '" y="-80" width="180" height="1160" rx="20" fill="url(#st' + id + ')"/>';
      // textura de escamas
      for (var r = 0; r < 26; r++) {
        for (var c = 0; c < 4; c++) {
          var w = 30 + ((r * 7 + c * 13) % 14);
          s += '<rect x="' + (cx - 78 + c * 40) + '" y="' + (-70 + r * 44) + '" width="' + w + '" height="38" rx="6" fill="none" stroke="#161613" stroke-opacity="0.35"/>';
        }
      }
      s += '<path d="M' + (cx - 78) + ' -80V1080M' + (cx + 78) + ' -80V1080" stroke="' + shade(p.strapColor, 0.4) + '" stroke-width="1.4" stroke-dasharray="7 6" opacity="0.6"/>';
      // hebilla y agujeros
      s += '<rect x="' + (cx - 110) + '" y="430" width="220" height="120" rx="34" fill="none" stroke="url(#mt' + id + ')" stroke-width="14"/>';
      s += '<rect x="' + (cx - 6) + '" y="430" width="12" height="160" rx="6" fill="url(#mr' + id + ')"/>';
      for (var hle = 0; hle < 4; hle++) s += '<circle cx="' + cx + '" cy="' + (680 + hle * 70) + '" r="7" fill="#161613" opacity="0.7"/>';
    }
    s += '</g>';
    return s;
  }

  /* ---------- Composición ---------- */

  function build(opts, variant) {
    var id = 'p' + (uid++);
    var p = {
      dial: opts.dial || '#16202b',
      m: METALS[opts.metal] || METALS.steel,
      strap: opts.strap || 'leather',
      strapColor: opts.strapColor || '#1a1410',
      accent: opts.accent || '#b8975a',
      label: (opts.label || '').replace(/[<>&"]/g, '')
    };
    var body = '';
    switch (variant) {
      case 'dial':
        body = '<g transform="translate(400 500) scale(2.3) translate(-400 -470)">' + watchFront(p, id, 400, 470) + '</g>';
        break;
      case 'case':
        body = watchCase(p, id);
        break;
      case 'movement':
        body = watchMovement(p, id);
        break;
      case 'bracelet':
        body = watchBracelet(p, id);
        break;
      case 'detail':
        body =
          '<g fill="none" stroke="' + p.accent + '" stroke-opacity="0.18">' +
            '<circle cx="400" cy="500" r="300"/><circle cx="400" cy="500" r="330" stroke-dasharray="2 8"/>' +
            '<line x1="40" y1="500" x2="760" y2="500"/><line x1="400" y1="120" x2="400" y2="880"/>' +
          '</g>' +
          '<g transform="rotate(-16 400 500) translate(400 500) scale(0.82) translate(-400 -500)">' + watchFront(p, id, 400, 500) + '</g>';
        break;
      default:
        body = '<g transform="translate(400 500) scale(0.92) translate(-400 -500)">' + watchFront(p, id, 400, 500) + '</g>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">' +
      defs(p, id) +
      '<rect width="800" height="1000" fill="url(#bg' + id + ')"/>' +
      body +
      '<rect width="800" height="1000" fill="url(#bg' + id + ')" opacity="0.18"/>' +
      '</svg>';
  }

  /**
   * Devuelve un data-URI SVG.
   * @param {object} opts  { dial, metal, strap, strapColor, accent, label }
   * @param {string|number} variant  nombre de variante o índice de imagen
   */
  function placeholder(opts, variant) {
    if (typeof variant === 'number') variant = VARIANTS[variant % VARIANTS.length];
    var key = JSON.stringify(opts) + '|' + variant;
    if (!cache[key]) cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(build(opts || {}, variant || 'front'));
    return cache[key];
  }

  window.LTPlaceholder = { image: placeholder, variants: VARIANTS };
})();
