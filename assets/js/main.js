/* Kinih shared layout + behaviour. Every page loads i18n.js, i18n-pages.js, then this file. */
(function () {
  var PHONE = '+212645678594', PHONE_TXT = '+212 6 45 67 85 94';
  var page = document.body.dataset.page || 'home';
  var links = [
    ['programs', 'programs.html', 'nav.programs'],
    ['coaches', 'coaches.html', 'nav.coaches'],
    ['results', 'results.html', 'nav.results'],
    ['pricing', 'pricing.html', 'nav.pricing'],
    ['join', 'membership.html', 'nav.join'],
    ['contact', 'contact.html', 'nav.contact']
  ];
  function navLinks() {
    return links.map(function (l) {
      return '<a href="' + l[1] + '" data-i18n="' + l[2] + '"' + (page === l[0] ? ' class="active"' : '') + '></a>';
    }).join('');
  }
  var langSwitch = '<div class="lang"><button data-lang="en">EN</button><button data-lang="fr">FR</button><button data-lang="ar">AR</button></div>';

  // header + mobile menu
  var header = document.createElement('div');
  header.innerHTML =
    '<div id="scroll-progress"></div>' +
    '<header id="header"><div class="container nav">' +
      '<a href="index.html" class="brand"><span class="brand-dot"></span>KINIH</a>' +
      '<nav class="nav-links">' + navLinks() + '</nav>' +
      '<div class="nav-right">' +
        '<a href="tel:' + PHONE + '" class="nav-phone"><i class="fa-solid fa-phone"></i>' + PHONE_TXT + '</a>' +
        langSwitch +
        '<a href="contact.html" class="btn btn-fill" data-i18n="nav.cta"></a>' +
        '<button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '</div></div></header>' +
    '<div class="mobile-menu" id="mobileMenu"><a href="index.html" data-i18n="nav.home"' + (page === 'home' ? ' class="active"' : '') + '></a>' + navLinks() + langSwitch + '</div>';
  while (header.firstChild) document.body.insertBefore(header.firstChild, document.body.firstChild);

  // footer + call button
  var foot = document.createElement('div');
  foot.innerHTML =
    '<footer><div class="container foot-grid">' +
      '<div><div class="brand"><span class="brand-dot"></span>KINIH</div><p data-i18n="ft.tag"></p>' +
        '<div class="socials"><a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a><a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a><a href="https://wa.me/212645678594" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a></div></div>' +
      '<div><h4 data-i18n="ft.prog"></h4><ul><li><a href="programs.html" data-i18n="p1.title"></a></li><li><a href="programs.html" data-i18n="p2.title"></a></li><li><a href="programs.html" data-i18n="p3.title"></a></li><li><a href="pricing.html" data-i18n="pl3.n"></a></li></ul></div>' +
      '<div><h4 data-i18n="ft.visit"></h4><ul><li><i class="fa-solid fa-phone"></i><a href="tel:' + PHONE + '" class="ltr">' + PHONE_TXT + '</a></li><li><i class="fa-solid fa-envelope"></i><a href="mailto:kinih@yahoo.com">kinih@yahoo.com</a></li><li><i class="fa-solid fa-location-dot"></i>1034 Rue des Orangers, Aïn Sebaâ</li><li><i class="fa-regular fa-clock"></i><span data-i18n="ct.hours"></span></li></ul></div>' +
      '<div><h4 data-i18n="ft.links"></h4><ul><li><a href="index.html" data-i18n="ft.home"></a></li>' +
        links.map(function (l) { return '<li><a href="' + l[1] + '" data-i18n="' + l[2] + '"></a></li>'; }).join('') + '</ul></div>' +
    '</div><div class="foot-bottom" data-i18n="ft.copy"></div></footer>' +
    '<a href="tel:' + PHONE + '" class="call-fab" aria-label="Call Kinih"><i class="fa-solid fa-phone"></i><span class="tip" data-i18n="fab"></span></a>';
  while (foot.firstChild) document.body.appendChild(foot.firstChild);

  // i18n
  window.currentLang = 'en';
  function renderHeadline(lines) {
    var h = document.getElementById('heroHeadline');
    if (!h) return;
    h.innerHTML = lines.map(function (line, i) {
      var words = line.split(' ').map(function (w) { return '<span class="word">' + w + '</span>'; }).join('');
      return '<span class="line' + (i === lines.length - 1 ? ' accent' : '') + '">' + words + '</span>';
    }).join('');
  }
  function renderMarquee(items) {
    var html = items.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    document.querySelectorAll('[data-marquee]').forEach(function (el) { el.innerHTML = html; });
  }
  window.setLang = function (lang) {
    var d = T[lang]; if (!d) return;
    window.currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-ph')];
      if (typeof v === 'string') el.placeholder = v;
    });
    renderHeadline(d['hero.h']);
    renderMarquee(d['marquee']);
    var dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.querySelectorAll('.lang button').forEach(function (b) { b.classList.toggle('active', b.dataset.lang === lang); });
    if (window.tSwiper) window.tSwiper.changeLanguageDirection(dir);
    try { localStorage.setItem('kinih_lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('kinih:lang', { detail: lang }));
  };
  // ?lang=fr in the URL wins (shareable links), then the visitor's last choice
  var qs = new URLSearchParams(location.search);
  var saved = 'en';
  try { saved = localStorage.getItem('kinih_lang') || 'en'; } catch (e) {}
  setLang(T[qs.get('lang')] ? qs.get('lang') : saved);

  // menu
  var burger = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
  function closeMenu() { burger.classList.remove('open'); menu.classList.remove('open'); }
  burger.addEventListener('click', function () { burger.classList.toggle('open'); menu.classList.toggle('open'); });
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); closeMenu(); });
  });

  // smooth scroll
  var lenis = window.Lenis ? new Lenis({ lerp: 0.08 }) : null;
  window.kinihLenis = lenis;
  if (lenis) {
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target || !lenis) return;
      e.preventDefault(); lenis.scrollTo(target, { offset: -64 });
    });
  });

  // header + progress bar
  var hdr = document.getElementById('header'), bar = document.getElementById('scroll-progress');
  function onScroll() {
    var y = window.scrollY;
    hdr.classList.toggle('scrolled', y > 80);
    var max = document.body.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? y / max * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ?static turns scroll animations off (handy for screenshots)
  if (window.AOS) AOS.init({ duration: 700, once: true, offset: 80, disable: qs.has('static') });

  // entrance animations
  if (window.gsap) {
    if (document.getElementById('heroHeadline')) {
      gsap.from('.hero-fade', { opacity: 0, y: 12, duration: 0.6 });
      gsap.from('.hero-headline .word', { y: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.15 });
      gsap.from('.hero-fade2', { opacity: 0, y: 20, duration: 0.7, stagger: 0.1, delay: 0.55, ease: 'power2.out' });
      gsap.from('.hero-photo', { opacity: 0, x: currentLang === 'ar' ? -60 : 60, duration: 0.9, delay: 0.55, ease: 'power3.out' });
      gsap.from('.hero-badge', { opacity: 0, y: -10, duration: 0.6, delay: 1.2 });
      gsap.from('.hero-card', { opacity: 0, y: 20, duration: 0.6, delay: 1.5 });
    }
    if (document.querySelector('.page-hero')) {
      gsap.from('.page-hero .label, .page-hero h1, .page-hero p, .page-hero .crumbs', { opacity: 0, y: 24, duration: 0.8, stagger: 0.12, ease: 'power3.out' });
    }
  }

  // counters
  var statsEl = document.querySelector('.stats');
  if (statsEl && window.gsap) {
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var o = { v: 0 };
        gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      });
    }, { threshold: 0.4 }).observe(statsEl);
  }

  // particles
  if (window.tsParticles && document.getElementById('particles')) tsParticles.load('particles', {
    fullScreen: { enable: false },
    particles: {
      number: { value: 28 }, color: { value: '#ffffff' },
      opacity: { value: 0.18, random: true, animation: { enable: true, speed: 0.6, minimumValue: 0.05, sync: false } },
      size: { value: 2, random: true },
      move: { enable: true, speed: 0.5, direction: 'top', random: true, straight: false, outModes: 'out' },
      shape: { type: 'circle' }
    },
    detectRetina: true
  });

  if (window.VanillaTilt && matchMedia('(hover:hover)').matches) {
    VanillaTilt.init(document.querySelectorAll('.service-card'), { max: 6, speed: 400, glare: true, 'max-glare': 0.15, perspective: 800 });
  }

  if (window.Swiper && document.querySelector('.testimonials-swiper')) {
    window.tSwiper = new Swiper('.testimonials-swiper', {
      loop: true, spaceBetween: 24, grabCursor: true, centeredSlides: true,
      autoplay: { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true },
      breakpoints: { 0: { slidesPerView: 1.15, centeredSlides: true }, 768: { slidesPerView: 2.2, centeredSlides: false }, 1024: { slidesPerView: 3, centeredSlides: false } }
    });
  }

  // booking form (contact page). No backend: shows a confirmation and opens an email draft to the gym.
  var form = document.getElementById('bookingForm');
  if (form) {
    var params = new URLSearchParams(location.search);
    var goal = document.getElementById('fGoal'), plan = document.getElementById('fPlan'), coach = document.getElementById('fCoach');
    if (params.get('goal')) goal.value = params.get('goal');
    if (params.get('plan')) plan.value = params.get('plan');
    if (params.get('coach')) coach.value = params.get('coach');
    var dateInput = document.getElementById('fDate');
    dateInput.min = new Date().toISOString().split('T')[0];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = T[currentLang];
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = 'KINIH-';
      for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      var body = [
        'Reference: ' + code,
        'Name: ' + document.getElementById('fName').value,
        'Phone: ' + document.getElementById('fPhone').value,
        'Goal: ' + goal.options[goal.selectedIndex].text,
        'Plan: ' + (plan.value || '-'),
        'Coach: ' + (coach.value || '-'),
        'Preferred date: ' + dateInput.value,
        'Notes: ' + (document.getElementById('fMsg').value || '-')
      ].join('\n');
      document.getElementById('formWrap').innerHTML =
        '<div class="success"><div class="ok"><i class="fa-solid fa-check"></i></div><h3>' + d['ok.title'] + '</h3><p>' + d['ok.sub'] + '</p>' +
        '<div class="ref"><small>' + d['ok.ref'] + '</small><b>' + code + '</b></div><p style="font-size:13px">' + d['ok.shot'] + '</p></div>';
      window.location.href = 'mailto:kinih@yahoo.com?subject=' + encodeURIComponent('Free assessment request ' + code) + '&body=' + encodeURIComponent(body);
    });
  }

  // account form (membership page). No backend: same pattern as the booking form, plus a WhatsApp confirmation.
  var join = document.getElementById('joinForm');
  if (join) {
    var jp = new URLSearchParams(location.search).get('plan');
    if (jp) join.querySelectorAll('input[name="plan"]').forEach(function (r) { r.checked = r.value === jp; });
    var jStart = document.getElementById('jStart');
    jStart.min = new Date().toISOString().split('T')[0];
    var qa = 2 + Math.floor(Math.random() * 7), qb = 1 + Math.floor(Math.random() * 8);
    var humanQ = document.getElementById('jHumanQ'), err = document.getElementById('jErr');
    var paintQ = function () { humanQ.innerHTML = T[currentLang]['j.f.human'].replace('{a}', qa).replace('{b}', qb); };
    paintQ();
    document.addEventListener('kinih:lang', paintQ);
    var val = function (id) { return document.getElementById(id).value.trim(); };
    var esc = function (s) { return s.replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
    join.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = T[currentLang];
      if (val('jWebsite')) return; // honeypot: bots fill hidden fields
      var fail = !val('jFirst') || !val('jLast') || !val('jPhone') || !document.getElementById('jEmail').checkValidity() || !val('jEmail') ? 'j.e.fill'
        : val('jEmail').toLowerCase() !== val('jEmail2').toLowerCase() ? 'j.e.email'
        : +val('jHuman') !== qa + qb ? 'j.e.human'
        : !document.getElementById('jAgree').checked ? 'j.e.agree' : '';
      if (fail) { err.textContent = d[fail]; err.classList.add('show'); return; }
      err.classList.remove('show');
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', id = 'KNH-';
      for (var i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
      var plan = join.querySelector('input[name="plan"]:checked').value;
      var name = val('jFirst') + ' ' + val('jLast');
      var body = [
        'Member number: ' + id,
        'Name: ' + name,
        'Phone: ' + val('jPhone'),
        'Email: ' + val('jEmail'),
        'Plan: ' + plan,
        'Wants to start: ' + (jStart.value || '-'),
        'WhatsApp reminders: ' + (document.getElementById('jWa').checked ? 'yes' : 'no'),
        'Language: ' + currentLang
      ].join('\n');
      var wa = 'https://wa.me/212645678594?text=' + encodeURIComponent('Hi Kinih, I just created my account. ' + id + ' / ' + name + ' / ' + plan);
      document.getElementById('joinWrap').innerHTML =
        '<div class="success"><div class="ok"><i class="fa-solid fa-check"></i></div><h3>' + d['j.ok.t'].replace('{name}', esc(val('jFirst'))) + '</h3><p>' + d['j.ok.s'] + '</p>' +
        '<div class="ref"><small>' + d['j.ok.id'] + '</small><b>' + id + '</b></div><p style="font-size:13px">' + d['j.ok.shot'] + '</p>' +
        '<a href="' + wa + '" target="_blank" rel="noopener" class="btn btn-fill" style="margin-top:18px"><i class="fa-brands fa-whatsapp"></i> ' + d['j.ok.wa'] + '</a></div>';
      window.location.href = 'mailto:kinih@yahoo.com?subject=' + encodeURIComponent('New member account ' + id) + '&body=' + encodeURIComponent(body);
    });
  }
})();
