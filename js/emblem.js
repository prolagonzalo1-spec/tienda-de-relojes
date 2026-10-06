/* ==========================================================================
   LUXURY TIME — Emblema = reloj en vivo (hora de Buenos Aires)
   Integrado desde emblema-reloj.html:
     · Bloque B (SVG inline): misma geometría, viewBox 240×240.
     · Bloque C (JS del reloj): misma lógica de hora y de fuentes.
   Cambio de integración: el demo usaba ids fijos (#lt-hour, #lt-min…) porque
   tenía un solo emblema; el sitio muestra varios (header, pie, pantalla de
   carga), así que las agujas se buscan por clase dentro de cada instancia.
   Los colores salen de los tokens del tema (ver .lt-emblem en styles.css).

   Uso:
     <span data-lt-emblem></span>      → se reemplaza por el SVG
     <span data-lt-digital></span>     → muestra HH:MM de Buenos Aires
     LTEmblem.setSource('api')         → sincroniza con TimeAPI.io (fallback: navegador)
   ========================================================================== */

(function () {
  'use strict';

  var TZ = 'America/Argentina/Buenos_Aires';
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- Bloque B: SVG del emblema ---------- */

  // 11 índices (el 12 es el triángulo); 3, 6 y 9 más largos. Misma fórmula que el original.
  function ticksMarkup() {
    var out = '';
    for (var h = 1; h < 12; h++) {
      var a = (h * 30 - 90) * Math.PI / 180;
      var long = (h % 3 === 0);
      var inner = long ? 92 : 97, outer = 101;
      out += '<line class="em-tick" stroke-width="' + (long ? '1.6' : '1') + '"' +
        ' x1="' + (120 + inner * Math.cos(a)).toFixed(2) + '" y1="' + (120 + inner * Math.sin(a)).toFixed(2) + '"' +
        ' x2="' + (120 + outer * Math.cos(a)).toFixed(2) + '" y2="' + (120 + outer * Math.sin(a)).toFixed(2) + '"/>';
    }
    return out;
  }

  var TICKS = ticksMarkup();

  function svgMarkup(withSeconds) {
    return '<svg class="lt-emblem" viewBox="0 0 240 240" xmlns="' + NS + '" role="img" aria-label="Luxury Time">' +
      /* bisel doble */
      '<circle class="em-ring" cx="120" cy="120" r="108" stroke-width="1.4"/>' +
      '<circle class="em-ring" cx="120" cy="120" r="102" stroke-width="0.6"/>' +
      /* índices */
      '<g class="em-ticks">' + TICKS + '</g>' +
      /* triángulo de buceo a las 12 */
      '<path class="em-gold" d="M115.5,20 L124.5,20 L120,31 Z"/>' +
      /* agujas (apuntan a las 12; se rotan alrededor de 120,120) */
      '<g class="em-hand em-hour"><polygon points="120,74 124,110.8 120,126.4 116,110.8"/></g>' +
      '<g class="em-hand em-min"><polygon points="120,48 123,105.6 120,130.1 117,105.6"/></g>' +
      (withSeconds ? '<g class="em-seconds"><line class="em-sec" x1="120" y1="132" x2="120" y2="40" stroke-width="1"/></g>' : '') +
      /* centro */
      '<circle class="em-gold" cx="120" cy="120" r="4.2"/>' +
      /* monograma SIEMPRE por encima de las agujas → siempre legible */
      '<text class="em-mono" x="120" y="121" text-anchor="middle" dominant-baseline="central" font-size="92" letter-spacing="2">LT</text>' +
      '</svg>';
  }

  /* ---------- Bloque C: fuentes de hora ---------- */

  /* Fuente A (default): hora de BA calculada en el navegador */
  function localBaMs() {
    var now = new Date();
    var p = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(now).reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second, now.getMilliseconds());
  }

  /* Fuente B (opcional): hora "oficial" vía TimeAPI.io.
     Sincroniza una vez (y cada 5 min) y después interpola localmente,
     para no golpear la API en cada frame. Si falla, vuelve al navegador. */
  var API_URL = 'https://timeapi.io/api/Time/current/zone?timeZone=' + encodeURIComponent(TZ);
  var RESYNC_MS = 5 * 60 * 1000;
  var apiBase = null;              // { baMs, perf }
  var usingApi = false;
  var resyncTimer = null;
  var state = 'Fuente: navegador';

  function setState(txt) {
    state = txt;
    document.documentElement.setAttribute('data-clock-source', apiBase ? 'api' : 'browser');
  }

  async function syncApi() {
    try {
      var r = await fetch(API_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      var baMs = Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.seconds, d.milliSeconds || 0);
      if (!isFinite(baMs)) throw new Error('respuesta inválida');
      apiBase = { baMs: baMs, perf: performance.now() };
      setState('Fuente: API (oficial)');
    } catch (e) {
      apiBase = null;
      setState('API sin respuesta — navegador');
    }
  }

  function currentBaMs() {
    return apiBase ? apiBase.baMs + (performance.now() - apiBase.perf) : localBaMs();
  }

  function setSource(source) {
    usingApi = source === 'api';
    clearInterval(resyncTimer);
    if (usingApi) {
      setState('Sincronizando…');
      syncApi();
      resyncTimer = setInterval(syncApi, RESYNC_MS);   // resync cada 5 min
    } else {
      apiBase = null;
      setState('Fuente: navegador');
    }
  }

  /* ---------- Render (todas las instancias) ---------- */

  function pad2(n) { return String(n).padStart(2, '0'); }

  var lastMinute = -1;

  function render() {
    var t = new Date(currentBaMs());
    var h = t.getUTCHours(), m = t.getUTCMinutes(), s = t.getUTCSeconds(), ms = t.getUTCMilliseconds();
    var hourRot = 'rotate(' + ((h % 12) * 30 + m * 0.5) + ' 120 120)';
    var minRot = 'rotate(' + (m * 6 + s * 0.1) + ' 120 120)';
    var secRot = 'rotate(' + (s * 6 + ms * 0.006) + ' 120 120)';

    var svgs = document.querySelectorAll('svg.lt-emblem');
    for (var i = 0; i < svgs.length; i++) {
      svgs[i].querySelector('.em-hour').setAttribute('transform', hourRot);
      svgs[i].querySelector('.em-min').setAttribute('transform', minRot);
      var sec = svgs[i].querySelector('.em-seconds');
      if (sec) sec.setAttribute('transform', secRot);
    }

    var digital = pad2(h) + ':' + pad2(m);
    var digits = document.querySelectorAll('[data-lt-digital]');
    for (var j = 0; j < digits.length; j++) {
      if (digits[j].textContent !== digital) {
        digits[j].textContent = digital;
        digits[j].setAttribute('datetime', digital);
      }
    }

    if (m !== lastMinute) { lastMinute = m; updateFavicon(h, m); }
    requestAnimationFrame(render);
  }

  /* ---------- Montaje ---------- */

  function mount(root) {
    var nodes = (root || document).querySelectorAll('[data-lt-emblem]:not([data-lt-mounted])');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].innerHTML = svgMarkup(nodes[i].hasAttribute('data-seconds'));
      nodes[i].setAttribute('data-lt-mounted', '');
    }
  }

  /* ---------- Favicon: el mismo emblema, con la hora y los colores del tema ----------
     Un favicon es una imagen aislada y no puede leer variables CSS, así que se
     genera con los valores que tienen los tokens en ese momento. */

  var favicon = null;
  var lastFavKey = '';

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function updateFavicon(h, m) {
    if (!favicon) favicon = document.getElementById('lt-favicon');
    if (!favicon) return;
    var gold = token('--gold'), fill = token('--gold-fill'), text = token('--text'), bg = token('--bg');
    if (h == null) { var t = new Date(currentBaMs()); h = t.getUTCHours(); m = t.getUTCMinutes(); }
    var key = [h, m, gold, fill, text, bg].join('|');
    if (key === lastFavKey) return;
    lastFavKey = key;
    var svg = svgMarkup(false)
      .replace('<svg class="lt-emblem"', '<svg')
      .replace('class="em-hand em-hour"', 'transform="rotate(' + ((h % 12) * 30 + m * 0.5) + ' 120 120)" fill="' + fill + '"')
      .replace('class="em-hand em-min"', 'transform="rotate(' + (m * 6) + ' 120 120)" fill="' + fill + '"')
      .replace(/class="em-ring"/g, 'fill="none" stroke="' + gold + '"')
      .replace(/class="em-tick"/g, 'stroke="' + gold + '"')
      .replace(/class="em-gold"/g, 'fill="' + gold + '"')
      .replace('class="em-mono"', 'fill="' + text + '" font-family="Cormorant Garamond, serif" font-weight="500"')
      .replace('class="em-ticks"', '')
      .replace('<circle', '<circle cx="120" cy="120" r="118" fill="' + bg + '"/><circle');
    favicon.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
  }

  // Re-generar el favicon cuando cambia el tema o la superficie (teatro).
  new MutationObserver(function () { lastFavKey = ''; updateFavicon(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Arranque ---------- */

  setState(state);
  mount(document);
  requestAnimationFrame(render);
  updateFavicon();

  window.LTEmblem = {
    mount: mount,
    setSource: setSource,
    getState: function () { return state; },
    markup: svgMarkup
  };
})();
