/* ==========================================================================
   LUXURY TIME — aplicación
   SPA estática con rutas por hash (compatible con GitHub Pages):
     #/                          Inicio y selector de marcas
     #/marca/:marca/presentacion Video de presentación de la marca
     #/marca/:marca              Catálogo de la marca
     #/marca/:marca/:modelo      Ficha del modelo
   Todo el contenido se lee de data.json.
   ========================================================================== */

(function () {
  'use strict';

  var app = document.getElementById('app');
  var veil = document.querySelector('.veil');
  var header = document.querySelector('.site-header');
  var headerBack = header.querySelector('.sh-back');
  var headerBackLabel = header.querySelector('.sh-back-label');
  var headerContext = header.querySelector('.sh-context');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (!hasGsap) {
    // Sin GSAP el sitio sigue siendo navegable, solo que sin animaciones.
    document.documentElement.classList.add('no-gsap');
    veil.style.display = 'none';
  } else {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });
    if (reducedMotion) gsap.globalTimeline.timeScale(20);
  }

  var DATA = null;
  var ctx = null;            // gsap.context de la vista actual
  var cleanups = [];         // funciones a ejecutar al salir de la vista
  var navToken = 0;
  var firstRender = true;

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function splitChars(text) {
    return Array.from(String(text)).map(function (ch) {
      return '<span class="char" aria-hidden="true">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
    }).join('');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function findBrand(id) {
    return (DATA.brands || []).filter(function (b) { return b.id === id; })[0] || null;
  }

  function findModel(brand, id) {
    return (brand.models || []).filter(function (m) { return m.id === id; })[0] || null;
  }

  // Una marca está disponible si tiene al menos un modelo y no está marcada como "coming-soon".
  function isAvailable(brand) {
    return !!brand && brand.status !== 'coming-soon' && Array.isArray(brand.models) && brand.models.length > 0;
  }

  function tween(target, vars) {
    if (!hasGsap) return Promise.resolve();
    return new Promise(function (resolve) {
      vars.onComplete = resolve;
      gsap.to(target, vars);
    });
  }

  /* ------------------------------------------------------------------------
     Imágenes con placeholder automático
     ------------------------------------------------------------------------ */

  var phOptions = {};

  function placeholderOpts(brand, model) {
    var key = brand.id + '/' + model.id;
    if (!phOptions[key]) {
      var pal = model.palette || {};
      phOptions[key] = {
        dial: pal.dial, metal: pal.metal, strap: pal.strap, strapColor: pal.strapColor,
        accent: pal.accent, label: brand.short || brand.name
      };
    }
    return key;
  }

  function imgTag(src, alt, phKey, variant, extra) {
    return '<img src="' + esc(src || '') + '" alt="' + esc(alt) + '" data-ph="' + esc(phKey) +
      '" data-variant="' + esc(variant) + '" decoding="async" ' + (extra || '') + '>';
  }

  function bindImages(root) {
    root.querySelectorAll('img[data-ph]').forEach(function (img) {
      var swap = function () {
        if (img.dataset.phDone) return;
        img.dataset.phDone = '1';
        var v = img.dataset.variant;
        img.src = window.LTPlaceholder.image(phOptions[img.dataset.ph], isNaN(v) ? v : Number(v));
      };
      img.addEventListener('error', swap);
      if (!img.getAttribute('src') || (img.complete && img.naturalWidth === 0)) swap();
    });
    root.querySelectorAll('img[data-hide-on-error]').forEach(function (img) {
      var hide = function () { img.style.display = 'none'; };
      img.addEventListener('error', hide);
      if (img.complete && img.naturalWidth === 0) hide();
    });
  }

  /* ------------------------------------------------------------------------
     Tema (noche / claro)
     El atributo data-theme de <html> controla los tokens de color. La elección
     se guarda en localStorage. Las rutas "teatro" (intro y ficha) marcan
     data-surface="stage" y se ven siempre en modo noche.
     ------------------------------------------------------------------------ */

  var THEME_KEY = 'lt-theme';
  var THEME_COLORS = { night: '#20201C', light: '#FBF8F1' };
  var root = document.documentElement;
  var themeToggle = header.querySelector('.theme-toggle');
  var themeLabel = themeToggle.querySelector('.tt-label');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var themeTimer = null;

  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'night'; }

  function syncThemeUI() {
    var theme = currentTheme();
    var stage = root.getAttribute('data-surface') === 'stage';
    themeLabel.textContent = theme === 'light' ? 'Claro' : 'Noche';
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo noche' : 'Cambiar a modo claro');
    themeToggle.title = stage ? 'Esta sección se presenta siempre en modo noche' : '';
    themeMeta.setAttribute('content', THEME_COLORS[stage ? 'night' : theme]);
  }

  function setTheme(theme) {
    root.classList.add('is-theme-switching');
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* almacenamiento no disponible */ }
    syncThemeUI();
    clearTimeout(themeTimer);
    themeTimer = setTimeout(function () { root.classList.remove('is-theme-switching'); }, 350);
  }

  function setStage(isStage) {
    if (isStage) root.setAttribute('data-surface', 'stage');
    else root.removeAttribute('data-surface');
    syncThemeUI();
  }

  themeToggle.addEventListener('click', function () {
    setTheme(currentTheme() === 'light' ? 'night' : 'light');
  });
  syncThemeUI();

  /* ------------------------------------------------------------------------
     Cabecera
     ------------------------------------------------------------------------ */

  function setHeader(opts) {
    header.dataset.state = opts.state || 'visible';
    if (opts.back) {
      headerBack.hidden = false;
      headerBack.setAttribute('href', opts.back.href);
      headerBackLabel.textContent = opts.back.label;
    } else {
      headerBack.hidden = true;
    }
    headerContext.textContent = opts.context || '';
  }

  function footerHTML() {
    return '<footer class="site-footer">' +
      '<span class="footer-logo"><span data-lt-emblem aria-hidden="true"></span>' + esc(DATA.site.name) + '</span>' +
      '<span class="footer-clock">Buenos Aires <time data-lt-digital>--:--</time></span>' +
      '<span>' + esc(DATA.site.footer) + '</span>' +
      '</footer>';
  }

  /* ------------------------------------------------------------------------
     Router
     ------------------------------------------------------------------------ */

  var ROUTES = [
    [/^\/?$/, renderHome],
    [/^\/marca\/([\w-]+)\/presentacion\/?$/, renderIntro],
    [/^\/marca\/([\w-]+)\/?$/, renderCatalog],
    [/^\/marca\/([\w-]+)\/([\w-]+)\/?$/, renderModel]
  ];

  function teardown() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
    cleanups = [];
    if (hasGsap) {
      if (ctx) ctx.revert();
      ctx = null;
      ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
    }
  }

  async function router() {
    var token = ++navToken;
    var path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';

    if (!firstRender && hasGsap) {
      await tween(veil, { autoAlpha: 1, duration: 0.8, ease: 'power2.inOut', overwrite: true });
      if (token !== navToken) return;
    }

    modal.close(true);
    teardown();
    setStage(false);
    window.scrollTo(0, 0);

    var matched = false;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i][0]);
      if (m) { matched = true; ROUTES[i][1].apply(null, m.slice(1)); break; }
    }
    if (!matched) renderNotFound();

    bindImages(app);
    if (window.LTEmblem) LTEmblem.mount(app);
    veil.classList.remove('is-loading');
    if (hasGsap) {
      ScrollTrigger.refresh();
      gsap.to(veil, { autoAlpha: 0, duration: firstRender ? 1.6 : 1.2, ease: 'power2.inOut', delay: 0.1, overwrite: true });
    }
    if (!firstRender) app.focus({ preventScroll: true });
    firstRender = false;
  }

  function animate(fn) {
    if (!hasGsap) return;
    ctx = gsap.context(fn, app);
  }

  /* ------------------------------------------------------------------------
     Vista: Inicio
     ------------------------------------------------------------------------ */

  function brandItemHTML(brand) {
    var available = isAvailable(brand);
    var logo = brand.logo ? '<img class="brand-logo" src="' + esc(brand.logo) + '" alt="" data-hide-on-error>' : '';
    var inner =
      logo +
      '<span class="brand-text">' +
        '<span class="brand-name">' + esc(brand.name) + '</span>' +
        '<span class="brand-meta">' + esc(brand.origin) + (brand.founded ? ' · ' + esc(brand.founded) : '') + '</span>' +
      '</span>' +
      '<span class="brand-cta">' + (available ? 'Descubrir' : 'Próximamente') + '</span>';

    if (available) {
      return '<li class="brand-item"><a class="brand-option" href="#/marca/' + esc(brand.id) + '/presentacion" ' +
        'aria-label="' + esc(brand.name) + ', descubrir">' + inner + '</a></li>';
    }
    return '<li class="brand-item"><div class="brand-option" aria-disabled="true" ' +
      'aria-label="' + esc(brand.name) + ', próximamente">' + inner + '</div></li>';
  }

  function renderHome() {
    var site = DATA.site;
    setHeader({ state: 'minimal' });
    document.title = 'Luxury Time — Alta relojería';

    app.innerHTML =
      '<section class="home">' +
        '<div class="home-hero">' +
          '<p class="eyebrow home-eyebrow">' + esc(site.eyebrow) + '</p>' +
          '<h1 class="home-logo" aria-label="' + esc(site.name) + '">' + splitChars(site.name) + '</h1>' +
          '<span class="home-rule" aria-hidden="true"></span>' +
          '<p class="home-tagline">' + esc(site.tagline) + '</p>' +
        '</div>' +
        '<nav class="brand-picker" aria-label="Selector de marcas">' +
          '<p class="eyebrow brand-picker-label">Seleccione una maison</p>' +
          '<ul class="brand-list">' + DATA.brands.map(brandItemHTML).join('') + '</ul>' +
        '</nav>' +
      '</section>';

    animate(function () {
      gsap.timeline({ delay: 0.3 })
        .from('.home-eyebrow', { autoAlpha: 0, y: 12, duration: 1.8 })
        .from('.home-logo .char', { autoAlpha: 0, y: 24, filter: 'blur(10px)', duration: 2.2, stagger: 0.07 }, '-=1.4')
        .from('.home-rule', { scaleX: 0, duration: 2.2, ease: 'power2.inOut' }, '-=1.6')
        .from('.home-tagline', { autoAlpha: 0, y: 14, duration: 1.8 }, '-=1.5')
        .from('.brand-picker-label', { autoAlpha: 0, duration: 1.6 }, '-=1')
        .from('.brand-item', { autoAlpha: 0, y: 34, duration: 1.8, stagger: 0.18 }, '-=1.3');
    });
  }

  /* ------------------------------------------------------------------------
     Vista: Intro de marca (video)
     ------------------------------------------------------------------------ */

  function renderIntro(brandId) {
    var brand = findBrand(brandId);
    if (!isAvailable(brand)) { location.replace('#/'); return; }

    var intro = brand.intro || {};
    setStage(true);
    setHeader({ state: 'hidden' });
    document.title = brand.name + ' — Luxury Time';

    app.innerHTML =
      '<section class="intro" aria-label="Presentación de ' + esc(brand.name) + '">' +
        (intro.poster ? '<img class="intro-poster" src="' + esc(intro.poster) + '" alt="" data-hide-on-error>' : '') +
        '<video class="intro-video" muted playsinline preload="auto"></video>' +
        '<div class="intro-fallback" hidden>' +
          (brand.logo ? '<img class="if-logo" src="' + esc(brand.logo) + '" alt="" data-hide-on-error>' : '') +
          '<p class="eyebrow if-eyebrow">Luxury Time presenta</p>' +
          '<h1 class="if-name" aria-label="' + esc(brand.name) + '">' + splitChars(brand.name) + '</h1>' +
          '<span class="if-rule" aria-hidden="true"></span>' +
          '<p class="meta-label if-meta">' + esc(brand.origin) + (brand.founded ? ' · Desde ' + esc(brand.founded) : '') + '</p>' +
        '</div>' +
        '<div class="intro-shade" aria-hidden="true"></div>' +
        '<span class="intro-brand">' + esc(brand.name) + '</span>' +
        '<button class="intro-skip" type="button">Saltar</button>' +
        '<span class="intro-progress" aria-hidden="true"></span>' +
      '</section>';

    var root = app.querySelector('.intro');
    var video = root.querySelector('.intro-video');
    var poster = root.querySelector('.intro-poster');
    var fallback = root.querySelector('.intro-fallback');
    var progress = root.querySelector('.intro-progress');
    var skip = root.querySelector('.intro-skip');
    var done = false;
    var usingFallback = false;
    var timers = [];
    var fallbackTl = null;

    function finish() {
      if (done) return;
      done = true;
      var go = function () { location.replace('#/marca/' + brand.id); };
      if (!hasGsap) return go();
      gsap.to(root.querySelectorAll('.intro-video, .intro-poster, .intro-fallback, .intro-brand, .intro-skip, .intro-progress'),
        { autoAlpha: 0, duration: 1.4, ease: 'power2.inOut', onComplete: go });
    }

    function startFallback() {
      if (usingFallback || done) return;
      usingFallback = true;
      timers.forEach(clearTimeout);
      video.removeAttribute('src');
      video.style.display = 'none';
      fallback.hidden = false;
      // Si hay póster, queda de fondo detrás del nombre de la marca.
      // (si todavía está cargando se usa igual; si falla, data-hide-on-error lo oculta)
      var hasPoster = poster && poster.style.display !== 'none' && !(poster.complete && poster.naturalWidth === 0);
      fallback.classList.toggle('has-poster', !!hasPoster);
      if (!hasGsap) { timers.push(setTimeout(finish, 4000)); return; }
      fallbackTl = gsap.timeline({ onComplete: finish });
      if (hasPoster) {
        fallbackTl
          .fromTo(poster, { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, duration: 2.4, ease: 'power2.out' }, 0)
          .to(poster, { scale: 1, duration: 7, ease: 'power1.out' }, 0);
      }
      fallbackTl
        .set(progress, { scaleX: 0 })
        .from(fallback.querySelector('.if-logo') || [], { autoAlpha: 0, scale: 0.9, duration: 2 }, 0.2)
        .from(fallback.querySelector('.if-eyebrow'), { autoAlpha: 0, y: 10, duration: 1.6 }, 0.6)
        .from(fallback.querySelectorAll('.if-name .char'), { autoAlpha: 0, y: 30, filter: 'blur(12px)', duration: 2, stagger: 0.06 }, 0.9)
        .from(fallback.querySelector('.if-rule'), { scaleX: 0, duration: 2, ease: 'power2.inOut' }, 1.8)
        .from(fallback.querySelector('.if-meta'), { autoAlpha: 0, y: 10, duration: 1.6 }, 2.4)
        .to(progress, { scaleX: 1, duration: 6.4, ease: 'none' }, 0)
        .to({}, { duration: 0.6 });
    }

    function onTime() {
      if (video.duration && hasGsap) gsap.set(progress, { scaleX: video.currentTime / video.duration });
    }

    function onPlaying() {
      timers.forEach(clearTimeout);
      if (poster && hasGsap) gsap.to(poster, { autoAlpha: 0, duration: 1.2 });
    }

    function onKey(e) { if (e.key === 'Escape') finish(); }

    video.addEventListener('ended', finish);
    video.addEventListener('error', startFallback);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('playing', onPlaying);
    skip.addEventListener('click', finish);
    document.addEventListener('keydown', onKey);

    cleanups.push(function () {
      done = true;
      timers.forEach(clearTimeout);
      if (fallbackTl) fallbackTl.kill();
      document.removeEventListener('keydown', onKey);
      video.pause();
      video.removeAttribute('src');
      video.load();
    });

    if (poster && hasGsap) gsap.to(poster, { autoAlpha: 1, duration: 1.2 });

    if (!intro.video) {
      startFallback();
    } else {
      video.muted = true;
      video.defaultMuted = true;
      video.src = intro.video;
      var p = video.play();
      if (p && p.catch) p.catch(function () { if (!done && video.paused) startFallback(); });
      // Si el video no arranca en un tiempo prudente, se usa la presentación animada.
      timers.push(setTimeout(function () { if (video.currentTime === 0) startFallback(); }, 6000));
    }

    animate(function () {
      gsap.from('.intro-skip, .intro-brand', { autoAlpha: 0, y: 10, duration: 1.6, delay: 1, stagger: 0.15 });
    });
    skip.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------------
     Vista: Catálogo de la marca
     ------------------------------------------------------------------------ */

  function renderCatalog(brandId) {
    var brand = findBrand(brandId);
    if (!brand) return renderNotFound();
    if (!isAvailable(brand)) return renderComingSoon(brand);

    setHeader({ back: { href: '#/', label: 'Marcas' }, context: brand.origin });
    document.title = brand.name + ' — Colecciones — Luxury Time';

    var cards = brand.models.map(function (model, i) {
      var key = placeholderOpts(brand, model);
      var cover = (model.images || [])[0];
      return '<li class="model-card">' +
        '<a href="#/marca/' + esc(brand.id) + '/' + esc(model.id) + '">' +
          '<div class="card-media">' + imgTag(cover, model.name, key, 'front', 'loading="' + (i < 2 ? 'eager' : 'lazy') + '"') + '</div>' +
          '<div class="card-body">' +
            '<p class="eyebrow card-collection">' + esc(model.collection) + '</p>' +
            '<h2 class="card-name">' + esc(model.name) + '</h2>' +
            '<span class="card-ref">' + esc(model.reference) + '</span>' +
            '<span class="card-line" aria-hidden="true"></span>' +
          '</div>' +
        '</a>' +
      '</li>';
    }).join('');

    var n = brand.models.length;
    app.innerHTML =
      '<section class="catalog">' +
        '<header class="catalog-hero">' +
          (brand.logo ? '<img class="catalog-logo" src="' + esc(brand.logo) + '" alt="" data-hide-on-error>' : '') +
          '<p class="eyebrow ch-eyebrow">' + esc(brand.origin) + (brand.founded ? ' · Desde ' + esc(brand.founded) : '') + '</p>' +
          '<h1 class="catalog-title">' + esc(brand.name) + '</h1>' +
          '<p class="catalog-desc">' + esc(brand.description) + '</p>' +
          '<p class="meta-label catalog-count">' + n + (n === 1 ? ' modelo' : ' modelos') + '</p>' +
        '</header>' +
        '<ul class="model-grid" role="list">' + cards + '</ul>' +
      '</section>' +
      footerHTML();

    animate(function () {
      gsap.timeline({ delay: 0.3 })
        .from('.catalog-logo', { autoAlpha: 0, scale: 0.92, duration: 2 })
        .from('.ch-eyebrow', { autoAlpha: 0, y: 12, duration: 1.6 }, '-=1.5')
        .from('.catalog-title', { autoAlpha: 0, y: 40, duration: 2 }, '-=1.3')
        .from('.catalog-desc, .catalog-count', { autoAlpha: 0, y: 20, duration: 1.8, stagger: 0.15 }, '-=1.4');

      gsap.set('.model-card', { autoAlpha: 0, y: 70 });
      ScrollTrigger.batch('.model-card', {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.8, stagger: 0.18, overwrite: true });
        }
      });
      gsap.utils.toArray('.card-media img').forEach(function (img) {
        gsap.fromTo(img, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: img.closest('.card-media'), start: 'top bottom', end: 'bottom top', scrub: 1.2 }
        });
      });
    });
  }

  function renderComingSoon(brand) {
    setHeader({ back: { href: '#/', label: 'Marcas' }, context: brand.origin });
    document.title = brand.name + ' — Próximamente — Luxury Time';
    app.innerHTML =
      '<section class="notfound">' +
        (brand.logo ? '<img class="catalog-logo" src="' + esc(brand.logo) + '" alt="" data-hide-on-error>' : '') +
        '<p class="eyebrow">Próximamente</p>' +
        '<h1>' + esc(brand.name) + '</h1>' +
        '<p>Esta maison llegará pronto a nuestra boutique.</p>' +
        '<a class="link-line" href="#/">Volver a las marcas</a>' +
      '</section>';
    animate(function () {
      gsap.from('.notfound > *', { autoAlpha: 0, y: 20, duration: 1.6, stagger: 0.15, delay: 0.3 });
    });
  }

  /* ------------------------------------------------------------------------
     Vista: Ficha de modelo
     ------------------------------------------------------------------------ */

  function renderModel(brandId, modelId) {
    var brand = findBrand(brandId);
    if (!isAvailable(brand)) return brand ? renderComingSoon(brand) : renderNotFound();
    var model = findModel(brand, modelId);
    if (!model) return renderNotFound();

    setStage(true);
    setHeader({ back: { href: '#/marca/' + brand.id, label: brand.name }, context: model.collection });
    document.title = model.name + ' — ' + brand.name + ' — Luxury Time';

    var key = placeholderOpts(brand, model);
    var images = model.images || [];
    var specs = model.specifications || { items: [] };

    // Lista de "pasos" (secciones narrativas + especificaciones), cada uno con su imagen.
    var steps = (model.sections || []).map(function (s, i) {
      return { label: s.eyebrow, image: s.image != null ? s.image : i };
    });
    steps.push({ label: 'Especificaciones', image: specs.image != null ? specs.image : images.length - 1 });

    // Si faltan rutas de imágenes, se completan con placeholders.
    var imageCount = Math.max(images.length, steps.reduce(function (m, s) { return Math.max(m, s.image + 1); }, 1));
    var visual = '';
    for (var i = 0; i < imageCount; i++) {
      visual += imgTag(images[i], model.name, key, i,
        'class="mv-img' + (i === steps[0].image ? ' is-first' : '') + '" data-index="' + i + '" loading="eager"' +
        (i === steps[0].image ? '' : ' aria-hidden="true"'));
    }

    var sectionsHTML = (model.sections || []).map(function (s, i) {
      var first = i === 0;
      var heading = first
        ? '<h1 class="ms-title reveal">' + esc(model.name) + '</h1>'
        : '<h2 class="ms-title reveal">' + esc(s.title) + '</h2>';
      return '<section class="ms' + (first ? ' ms-first' : '') + '" id="' + esc(s.id) + '" data-step="' + i + '">' +
        '<div class="ms-inner">' +
          '<div class="ms-head">' +
            '<p class="eyebrow reveal"><span class="num">' + pad(i + 1) + '</span>' + esc(first ? model.collection : s.eyebrow) + '</p>' +
            heading +
          '</div>' +
          '<p class="ms-text reveal">' + esc(s.text) + '</p>' +
          (first ? '<p class="ms-ref reveal">' + esc(model.reference) + '</p><p class="ms-hint reveal" aria-hidden="true">Desplazarse</p>' : '') +
        '</div>' +
      '</section>';
    }).join('');

    var specsHTML =
      '<section class="ms ms-specs" id="especificaciones" data-step="' + (steps.length - 1) + '">' +
        '<div class="ms-inner">' +
          '<div class="ms-head">' +
            '<p class="eyebrow reveal"><span class="num">' + pad(steps.length) + '</span>Especificaciones</p>' +
            '<h2 class="ms-title reveal">' + esc(specs.title || 'Especificaciones técnicas') + '</h2>' +
          '</div>' +
          '<dl class="specs">' + (specs.items || []).map(function (it) {
            return '<div class="spec reveal-spec"><dt>' + esc(it.label) + '</dt><dd>' + esc(it.value) + '</dd></div>';
          }).join('') + '</dl>' +
          '<div class="ms-actions reveal">' +
            '<button class="btn btn-solid" type="button" data-appointment>Solicitar cita en boutique</button>' +
          '</div>' +
        '</div>' +
      '</section>';

    var idx = brand.models.indexOf(model);
    var next = brand.models[(idx + 1) % brand.models.length];
    var nextHTML = next !== model
      ? '<nav class="model-next" aria-label="Siguiente modelo">' +
          '<a href="#/marca/' + esc(brand.id) + '/' + esc(next.id) + '">' +
            '<span class="eyebrow">Siguiente modelo · ' + esc(next.collection) + '</span>' +
            '<span class="next-name">' + esc(next.name) + '</span>' +
          '</a>' +
          '<a class="link-line" href="#/marca/' + esc(brand.id) + '">Ver toda la colección</a>' +
        '</nav>'
      : '<nav class="model-next"><a class="link-line" href="#/marca/' + esc(brand.id) + '">Ver toda la colección</a></nav>';

    app.innerHTML =
      '<article class="model">' +
        '<div class="mv">' +
          '<div class="mv-stack">' + visual + '</div>' +
          '<div class="mv-index" aria-hidden="true">' +
            '<span class="mv-count">01</span><span class="mv-sep"></span><span class="mv-label">' + esc(steps[0].label) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ms-list">' + sectionsHTML + specsHTML + '</div>' +
        nextHTML +
      '</article>' +
      footerHTML();

    var btn = app.querySelector('[data-appointment]');
    btn.addEventListener('click', function () { modal.open(model, btn); });

    if (!hasGsap) {
      app.querySelectorAll('.mv-img').forEach(function (im, j) { im.style.opacity = j === steps[0].image ? 1 : 0; });
      return;
    }

    var imgs = gsap.utils.toArray(app.querySelectorAll('.mv-img'));
    var count = app.querySelector('.mv-count');
    var label = app.querySelector('.mv-label');
    var current = -1;

    function activate(step) {
      if (step === current) return;
      current = step;
      var target = steps[step].image;
      imgs.forEach(function (im, j) {
        var on = j === target;
        im.setAttribute('aria-hidden', on ? 'false' : 'true');
        gsap.to(im, { autoAlpha: on ? 1 : 0, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto' });
        if (on) gsap.fromTo(im, { scale: 1.07 }, { scale: 1, duration: 7, ease: 'power1.out', overwrite: 'auto' });
      });
      count.textContent = pad(step + 1);
      label.textContent = steps[step].label;
      gsap.fromTo([count, label], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, overwrite: 'auto' });
    }

    animate(function () {
      var mobile = window.matchMedia('(max-width: 900px)').matches;
      var mv = app.querySelector('.mv');
      var sections = gsap.utils.toArray('.ms');
      sections.forEach(function (sec, idx) {
        var step = Number(sec.dataset.step);
        var head = (sections[idx - 1] || sec).querySelector('.ms-head');
        // En mobile el encabezado de cada sección queda fijo debajo de la imagen. La imagen cambia
        // justo cuando la sección nueva empieza a empujar al encabezado anterior (por eso se usa
        // la altura del encabezado anterior): así el título de la sección activa siempre se ve completo.
        var line = function () { return mobile ? (mv.offsetHeight + head.offsetHeight) + 'px' : '55%'; };
        ScrollTrigger.create({
          trigger: sec,
          start: function () { return 'top ' + line(); },
          end: function () { return 'bottom ' + line(); },
          invalidateOnRefresh: true,
          onToggle: function (self) { if (self.isActive) activate(step); }
        });

        gsap.from(sec.querySelectorAll('.reveal'), {
          y: 70, autoAlpha: 0, duration: 1.9, stagger: 0.16,
          delay: step === 0 ? 0.5 : 0,
          scrollTrigger: { trigger: sec, start: 'top 78%', once: true }
        });

        var rows = sec.querySelectorAll('.reveal-spec');
        if (rows.length) {
          gsap.from(rows, {
            y: 30, autoAlpha: 0, duration: 1.4, stagger: 0.08,
            scrollTrigger: { trigger: sec.querySelector('.specs'), start: 'top 82%', once: true }
          });
        }
      });

      gsap.from('.model-next > *', {
        y: 40, autoAlpha: 0, duration: 1.6, stagger: 0.15,
        scrollTrigger: { trigger: '.model-next', start: 'top 80%', once: true }
      });
    });

    activate(0);
  }

  /* ------------------------------------------------------------------------
     Vista: No encontrado
     ------------------------------------------------------------------------ */

  function renderNotFound() {
    setHeader({ back: { href: '#/', label: 'Inicio' } });
    document.title = 'Página no encontrada — Luxury Time';
    app.innerHTML =
      '<section class="notfound">' +
        '<p class="eyebrow">Error 404</p>' +
        '<h1>Este instante no existe</h1>' +
        '<p>La página que busca no se encuentra en nuestra boutique.</p>' +
        '<a class="link-line" href="#/">Volver al inicio</a>' +
      '</section>';
    animate(function () {
      gsap.from('.notfound > *', { autoAlpha: 0, y: 20, duration: 1.6, stagger: 0.15, delay: 0.3 });
    });
  }

  /* ------------------------------------------------------------------------
     Modal: solicitud de cita (no envía datos)
     ------------------------------------------------------------------------ */

  var modal = (function () {
    var el = document.getElementById('appointment');
    var panel = el.querySelector('.modal-panel');
    var backdrop = el.querySelector('.modal-backdrop');
    var form = el.querySelector('.appt-form');
    var viewForm = el.querySelector('[data-view="form"]');
    var viewDone = el.querySelector('[data-view="done"]');
    var errorMsg = el.querySelector('.form-error');
    var dateInput = form.elements.fecha;
    var lastFocus = null;
    var isOpen = false;

    function tomorrowISO() {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function focusables() {
      return Array.prototype.filter.call(
        panel.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])'),
        function (n) { return !n.closest('[hidden]') && !n.disabled; }
      );
    }

    function onKey(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    function open(model, opener) {
      lastFocus = opener || document.activeElement;
      el.querySelectorAll('[data-model-name]').forEach(function (n) { n.textContent = model.name; });
      form.reset();
      form.querySelectorAll('.is-invalid').forEach(function (n) { n.classList.remove('is-invalid'); });
      errorMsg.hidden = true;
      dateInput.min = tomorrowISO();
      viewForm.hidden = false;
      viewDone.hidden = true;
      el.hidden = false;
      isOpen = true;
      document.body.classList.add('is-locked');
      document.addEventListener('keydown', onKey);
      if (hasGsap) {
        gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' });
        gsap.fromTo(panel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.2, delay: 0.1 });
        gsap.from(viewForm.children, { autoAlpha: 0, y: 16, duration: 1.2, stagger: 0.08, delay: 0.3 });
      }
      setTimeout(function () { form.elements.nombre.focus(); }, 350);
    }

    function close(immediate) {
      if (!isOpen) return;
      isOpen = false;
      document.removeEventListener('keydown', onKey);
      var finish = function () {
        el.hidden = true;
        document.body.classList.remove('is-locked');
        if (lastFocus && document.contains(lastFocus) && !immediate) lastFocus.focus({ preventScroll: true });
      };
      if (!hasGsap || immediate === true) return finish();
      gsap.to(panel, { autoAlpha: 0, y: 20, duration: 0.7, ease: 'power2.in' });
      gsap.to(backdrop, { autoAlpha: 0, duration: 0.8, delay: 0.1, onComplete: finish });
    }

    function formatDate(iso) {
      var d = new Date(iso + 'T12:00:00');
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid') && e.target.checkValidity()) e.target.classList.remove('is-invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = [];
      Array.prototype.forEach.call(form.elements, function (f) {
        if (f.tagName !== 'INPUT') return;
        if (f.type === 'text') f.value = f.value.trim();
        var ok = f.checkValidity();
        f.classList.toggle('is-invalid', !ok);
        f.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) invalid.push(f);
      });
      if (invalid.length) {
        errorMsg.hidden = false;
        invalid[0].focus();
        return;
      }
      errorMsg.hidden = true;

      // No se envía ningún dato: solo se muestra la confirmación.
      el.querySelector('[data-done-name]').textContent = form.elements.nombre.value.split(' ')[0];
      el.querySelector('[data-done-date]').textContent = formatDate(form.elements.fecha.value);
      el.querySelector('[data-done-email]').textContent = form.elements.email.value;

      var showDone = function () {
        viewForm.hidden = true;
        viewDone.hidden = false;
        viewDone.querySelector('.modal-title').focus({ preventScroll: true });
        if (hasGsap) {
          gsap.set(viewForm, { clearProps: 'all' });
          gsap.from(viewDone.querySelector('.done-mark'), { scale: 0.6, autoAlpha: 0, duration: 1.4, ease: 'expo.out' });
          gsap.from(Array.prototype.slice.call(viewDone.children, 1), { autoAlpha: 0, y: 18, duration: 1.4, stagger: 0.12, delay: 0.2 });
        }
      };
      if (hasGsap) gsap.to(viewForm, { autoAlpha: 0, y: -10, duration: 0.6, ease: 'power2.in', onComplete: showDone });
      else showDone();
    });

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close();
    });

    return { open: open, close: close };
  })();

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */

  function showLoadError(err) {
    console.error(err);
    veil.classList.remove('is-loading');
    if (hasGsap) gsap.to(veil, { autoAlpha: 0, duration: 0.8 });
    else veil.style.display = 'none';
    setHeader({ state: 'visible' });
    app.innerHTML =
      '<section class="notfound">' +
        '<p class="eyebrow">Error</p>' +
        '<h1>No se pudo cargar el catálogo</h1>' +
        '<p>Verifique que <code>data.json</code> exista y sea válido. Si abrió el archivo directamente desde el disco, ' +
        'sírvalo con un servidor local (por ejemplo <code>python3 -m http.server</code>) o publíquelo en GitHub Pages.</p>' +
      '</section>';
  }

  fetch('data.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (json) {
      DATA = json;
      DATA.site = DATA.site || { name: 'LUXURY TIME', tagline: '', eyebrow: '', footer: '' };
      DATA.brands = DATA.brands || [];
      // Fuente de hora del emblema: "browser" (default) o "api" (TimeAPI.io con fallback al navegador)
      if (window.LTEmblem && DATA.site.clock && DATA.site.clock.source === 'api') LTEmblem.setSource('api');
      window.addEventListener('hashchange', router);
      router();
    })
    .catch(showLoadError);
})();
