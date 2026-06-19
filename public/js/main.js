// Mobile nav toggle
(function () {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Close menu after clicking a link (mobile)
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Scrollspy — highlight the nav link for the section currently in view
(function () {
  const links = Array.from(document.querySelectorAll('.main-nav .nav-link'));
  if (!links.length) return;

  const homeLink = links.find(function (l) { return (l.getAttribute('href') || '') === '/'; });

  // Only links that point to a section present on THIS page
  const spies = [];
  links.forEach(function (link) {
    const id = link.getAttribute('data-section');
    if (!id) return;
    const section = document.getElementById(id);
    if (section) spies.push({ link: link, section: section });
  });
  if (!spies.length) return; // not the home page — nothing to spy on

  function setActive(activeLink) {
    links.forEach(function (l) { l.classList.remove('is-active'); });
    if (activeLink) activeLink.classList.add('is-active');
  }

  let ticking = false;
  function update() {
    ticking = false;
    const pos = window.scrollY + 100; // account for sticky header

    // Near the very top → Home
    if (window.scrollY < 220) { setActive(homeLink || null); return; }

    // Near the bottom → last section (e.g. Contact / footer)
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      setActive(spies[spies.length - 1].link);
      return;
    }

    let current = null;
    spies.forEach(function (s) {
      const top = s.section.getBoundingClientRect().top + window.scrollY;
      if (top <= pos) current = s;
    });
    setActive(current ? current.link : (homeLink || null));
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

// Reveal-on-scroll for sections
(function () {
  if (!('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.service-card, .price-card, .testimonial-card, .process-step, .stat');
  els.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
  });
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();
