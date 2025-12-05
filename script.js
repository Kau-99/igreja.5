'use strict';
(() => {
  const MyApp = (window.MyApp = window.MyApp || {});

  /* Config */
  MyApp.config = {
    ENV: (window.ENVIRONMENT || 'production').toLowerCase(),
    scrollTopThreshold: 260,
    toastDuration: 2800,
    lazySelector: 'img[data-src], .lazy[data-src], [data-lazy], iframe[data-src]'
  };

  /* Logger enxuto */
  MyApp.log = (...a) => (MyApp.config.ENV === 'development' ? console.log('[ADVIC]', ...a) : 0);

  /* Util */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  /* ========== Segurança ========== */
  MyApp.Security = {
    hardenLinks() {
      $$('a[href]').forEach((a) => {
        const href = (a.getAttribute('href') || '').trim();
        if (/^\s*javascript:/i.test(href) || /^\s*data:/i.test(href)) {
          a.removeAttribute('href');
          a.setAttribute('role', 'link');
        }
        const isExternal = /^https?:\/\//i.test(href) && !href.includes(location.host);
        if (isExternal) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
      });
    },
    frameBusting() {
      try {
        if (window.top !== window.self) window.top.location = window.location;
      } catch {}
    }
  };

  /* ========== Menu Responsivo ========== */
  MyApp.initMenu = () => {
    const toggle = $('.nav-toggle');
    const nav = $('.nav-wrapper');
    if (!toggle || !nav) return;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu de navegação');

    on(toggle, 'click', () => {
      const isOpen = toggle.classList.toggle('open');
      nav.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    });

    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && toggle.classList.contains('open')) {
        toggle.click();
        toggle.focus();
      }
    });
  };

  /* ========== Smooth Scroll ========== */
  MyApp.initSmoothScroll = () => {
    $$('a[href^="#"]').forEach((link) => {
      on(link, 'click', (e) => {
        const id = link.getAttribute('href');
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  };

  /* ========== Toast com fila ========== */
  const queue = [];
  let active = false;
  MyApp.showToast = (message = '', type = 'info') => {
    queue.push({ message: String(message), type });
    if (!active) processQueue();
  };
  function processQueue() {
    if (!queue.length) return (active = false);
    active = true;
    const { message, type } = queue.shift();
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener(
        'transitionend',
        () => {
          toast.remove();
          setTimeout(processQueue, 180);
        },
        { once: true }
      );
    }, MyApp.config.toastDuration);
  }

  /* ========== Lazy Load (imgs, iframes, bg) ========== */
  MyApp.initLazy = () => {
    const items = $$(MyApp.config.lazySelector);
    if (!items.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const src = el.dataset.src || el.dataset.lazy;
        if (!src) return obs.unobserve(el);
        if (el.tagName === 'IMG' || el.tagName === 'IFRAME') el.src = src;
        else el.style.backgroundImage = `url(${src})`;
        el.removeAttribute('data-src');
        el.removeAttribute('data-lazy');
        obs.unobserve(el);
      });
    }, { threshold: 0.12 });
    items.forEach((i) => io.observe(i));
  };

  /* ========== ScrollSpy (âncoras locais) ========== */
  MyApp.initScrollSpy = () => {
    const sections = $$('section[id]');
    const links = $$('.nav-menu a[href^="#"]');
    if (!sections.length || !links.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          const act = $(`.nav-menu a[href="#${en.target.id}"]`);
          if (act) act.classList.add('active');
        }
      });
    }, { threshold: 0.6 });
    sections.forEach((s) => io.observe(s));
  };

  /* ========== Animação On-Scroll (sutil) ========== */
  MyApp.initReveal = () => {
    const els = $$('[data-animate]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const delay = parseInt(en.target.dataset.delay || '0', 10);
        setTimeout(() => en.target.classList.add('in'), delay);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    els.forEach((el) => io.observe(el));
  };

  /* ========== Timeline (sobre) ========== */
  MyApp.initTimeline = () => {
    const items = $$('.timeline .timeline-item');
    if (!items.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add('show');
      });
    }, { threshold: 0.4 });
    items.forEach((i) => io.observe(i));
  };

  /* ========== Formulário de contato (agora abrindo WhatsApp) ========== */
  MyApp.initContactForm = () => {
    const form = $('.contact-form');
    if (!form) return;

    // validação live
    ['input', 'blur'].forEach((ev) => {
      on(
        form,
        ev,
        (e) => {
          const t = e.target;
          if (!t.matches('input, textarea')) return;
          t.classList.toggle('input-error', !t.checkValidity() || !t.value.trim());
        },
        true
      );
    });

    on(form, 'submit', async (e) => {
      // Se você futuramente configurar um backend (Formspree etc.), essa verificação permite que ele funcione
      if (/formspree|formspark|getform|staticforms/i.test(form.action)) return;

      e.preventDefault();

      const honeypot = form.querySelector('.honeypot');
      if (honeypot && honeypot.value.trim()) return; // bot

      const nome = $('#nome'),
        email = $('#email'),
        assunto = $('#assunto'),
        msg = $('#mensagem');

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
      const ok = nome.value.trim() && emailOk && assunto.value.trim() && msg.value.trim();

      [nome, email, assunto, msg].forEach((el) =>
        el.classList.toggle('input-error', !el.value.trim())
      );
      if (!emailOk) email.classList.add('input-error');

      if (!ok) {
        return MyApp.showToast('Preencha os campos corretamente.', 'error');
      }

      // ========= Envio via WhatsApp (sem backend) =========
      // Troque pelo número REAL da igreja, no formato 55 + DDD + número, somente dígitos.
      // Exemplo: 55 21 99999-0000  ->  "5521999990000"
      const numeroIgreja = '552100000000'; // TODO: ajustar para o número oficial

      const textoMensagem =
        'Nova mensagem do site ADVIC:\n' +
        `Nome: ${nome.value.trim()}\n` +
        `E-mail: ${email.value.trim()}\n` +
        `Assunto: ${assunto.value.trim()}\n` +
        `Mensagem: ${msg.value.trim()}`;

      const linkWhats = `https://wa.me/${numeroIgreja}?text=${encodeURIComponent(textoMensagem)}`;

      // Abre o WhatsApp (app ou web) com a mensagem preenchida
      window.open(linkWhats, '_blank');

      MyApp.showToast('Abrindo WhatsApp com a sua mensagem…', 'success');
      form.reset();
    });
  };

  /* ========== Filtro de eventos (eventos.html) ========== */
  MyApp.initEventos = () => {
    const select = $('#filtro-eventos');
    const cards = $$('[data-evento]');
    if (!select || !cards.length) return;
    on(select, 'change', () => {
      const f = select.value;
      cards.forEach((c) => {
        const match = f === 'todos' || c.dataset.tipo === f;
        c.style.display = match ? '' : 'none';
      });
    });
  };

  /* ========== Botão Voltar ao Topo ========== */
  MyApp.initTop = () => {
    const btn = $('#btnTop');
    if (!btn) return;
    const toggle = () =>
      btn.classList.toggle('show', window.scrollY > MyApp.config.scrollTopThreshold);
    on(window, 'scroll', toggle, { passive: true });
    toggle();
    on(btn, 'click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  /* ========== Prefetch on hover ========== */
  MyApp.prefetch = () => {
    $$('a[href$=".html"]').forEach((a) => {
      a.addEventListener(
        'mouseenter',
        () => {
          const l = document.createElement('link');
          l.rel = 'prefetch';
          l.as = 'document';
          l.href = a.getAttribute('href');
          document.head.appendChild(l);
        },
        { once: true, passive: true }
      );
    });
  };

  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    MyApp.Security.hardenLinks();
    MyApp.Security.frameBusting();

    MyApp.initMenu();
    MyApp.initSmoothScroll();
    MyApp.initLazy();
    MyApp.initScrollSpy();
    MyApp.initReveal();
    MyApp.initTimeline();
    MyApp.initContactForm();
    MyApp.initEventos();
    MyApp.initTop();
    MyApp.prefetch();

    // Lazy-iframe do mapa
    const map = document.querySelector('.mapa-wrapper iframe[data-src]');
    if (map) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          map.src = map.dataset.src;
          map.removeAttribute('data-src');
          obs.unobserve(map);
        });
      });
      io.observe(map);
    }
  });
})();
