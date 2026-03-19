'use strict';
(() => {
  const MyApp = (window.MyApp = window.MyApp || {});

  /* Config */
  MyApp.config = {
    ENV: (window.ENVIRONMENT || 'production').toLowerCase(),
    scrollTopThreshold: 260,
    toastDuration: 4000,
    lazySelector: 'img[data-src], .lazy[data-src], [data-lazy], iframe[data-src]'
  };

  MyApp.log = (...a) =>
    MyApp.config.ENV === 'development' ? console.log('[ADVIC]', ...a) : 0;

  /* Util */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  /* ========== Segurança ========== */
  MyApp.Security = {
    hardenLinks() {
      $$('a[href]').forEach((a) => {
        const raw = (a.getAttribute('href') || '').trim();
        if (!raw) return;
        if (/^\s*(javascript|data):/i.test(raw)) {
          a.removeAttribute('href');
          a.setAttribute('role', 'link');
          a.dataset.blockedHref = 'blocked';
          return;
        }
        if (raw.startsWith('#') || raw.toLowerCase().startsWith('mailto:') || raw.toLowerCase().startsWith('tel:')) return;

        let url;
        try { url = new URL(raw, window.location.origin); } catch { return; }

        if (url.origin !== window.location.origin) {
          a.setAttribute('target', '_blank');
          const rel = (a.getAttribute('rel') || '').split(/\s+/);
          if (!rel.includes('noopener')) rel.push('noopener');
          if (!rel.includes('noreferrer')) rel.push('noreferrer');
          a.setAttribute('rel', rel.join(' ').trim());
        }
      });
    },
    frameBusting() {
      try {
        if (window.top !== window.self && !document.body.classList.contains('allow-embed')) {
          window.top.location = window.location;
        }
      } catch { /* ignore */ }
    },
    enforceHTTPS() {
      if (window.location.protocol === 'http:' && !/^localhost$/i.test(window.location.hostname) && !/^127\.0\.0\.1$/i.test(window.location.hostname)) {
        window.location.replace('https://' + window.location.host + window.location.pathname + window.location.search + window.location.hash);
      }
    },
    lockConsole() {
      if (MyApp.config.ENV !== 'production') return;
      const noop = () => {};
      ['log', 'debug', 'info', 'trace'].forEach((m) => { try { console[m] = noop; } catch { /* ignore */ } });
    },
    warnInlineHandlers() {
      const hasInline = [];
      $$('*').forEach((el) => {
        for (const attr of el.attributes) {
          if (/^on/i.test(attr.name)) hasInline.push({ el, attr: attr.name });
        }
      });
      if (hasInline.length && MyApp.config.ENV === 'development') {
        MyApp.log('Elementos com handlers inline encontrados. Evite isso por segurança.', hasInline);
      }
    }
  };

  /* ========== Preloader ========== */
  MyApp.initPreloader = () => {
    const preloader = $('#preloader');
    if (!preloader) return;
    const MIN_TIME = 600, MAX_TIME = 8000;
    const start = (window.performance && performance.now) ? performance.now() : Date.now();
    document.body.classList.add('preloader-active');

    const hidePreloader = () => {
      const elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - start;
      const remaining = Math.max(0, MIN_TIME - elapsed);
      setTimeout(() => {
        preloader.classList.add('preloader--hidden');
        document.body.classList.remove('preloader-active');
        setTimeout(() => {
          if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 600);
      }, remaining);
    };

    let alreadyHidden = false;
    const safeHide = () => { if (alreadyHidden) return; alreadyHidden = true; hidePreloader(); };
    window.addEventListener('load', safeHide);
    setTimeout(safeHide, MAX_TIME);
  };

  /* ========== Menu Responsivo ========== */
  MyApp.initMenu = () => {
    const toggle = $('.nav-toggle'), nav = $('.nav-wrapper');
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
      if (e.key === 'Escape' && toggle.classList.contains('open')) { toggle.click(); toggle.focus(); }
    });
  };

  /* ========== Smooth Scroll ========== */
  MyApp.initSmoothScroll = () => {
    $$('a[href^="#"]').forEach((link) => {
      on(link, 'click', (e) => {
        const id = link.getAttribute('href'), target = $(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  };

  /* ========== Toast ========== */
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
      toast.addEventListener('transitionend', () => {
        toast.remove();
        setTimeout(processQueue, 180);
      }, { once: true });
    }, MyApp.config.toastDuration);
  }

  /* ========== Lazy Load ========== */
  MyApp.initLazy = () => {
    const items = $$(MyApp.config.lazySelector);
    if (!items.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const src = el.dataset.src || el.dataset.lazy;
        if (!src) return obs.unobserve(el);
        if (/^\s*javascript:/i.test(src)) return obs.unobserve(el);
        if (el.tagName === 'IMG' || el.tagName === 'IFRAME') el.src = src;
        else el.style.backgroundImage = `url(${src})`;
        el.removeAttribute('data-src'); el.removeAttribute('data-lazy');
        obs.unobserve(el);
      });
    }, { threshold: 0.12 });
    items.forEach((i) => io.observe(i));
  };

  /* ========== ScrollSpy ========== */
  MyApp.initScrollSpy = () => {
    const sections = $$('section[id]'), links = $$('.nav-menu a[href^="#"]');
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

  /* ========== Reveal On-Scroll ========== */
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

  /* ========== Timeline ========== */
  MyApp.initTimeline = () => {
    const items = $$('.timeline .timeline-item');
    if (!items.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add('show'); });
    }, { threshold: 0.4 });
    items.forEach((i) => io.observe(i));
  };

  /* ========== Formulário de Contato PRO (Envio AJAX via Formspree) ========== */
  MyApp.initContactForm = () => {
    const form = $('.contact-form');
    if (!form) return;

    ['input', 'blur'].forEach((ev) => {
      on(form, ev, (e) => {
        const t = e.target;
        if (!t.matches('input, textarea')) return;
        t.classList.toggle('input-error', !t.checkValidity() || !t.value.trim());
      }, true);
    });

    on(form, 'submit', async (e) => {
      e.preventDefault();

      const honeypot = form.querySelector('.honeypot');
      if (honeypot && honeypot.value.trim()) return; 

      const nome = $('#nome'), email = $('#email'), assunto = $('#assunto'), msg = $('#mensagem');
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
      const ok = nome.value.trim() && emailOk && assunto.value.trim() && msg.value.trim();

      [nome, email, assunto, msg].forEach((el) => el.classList.toggle('input-error', !el.value.trim()));
      if (!emailOk) email.classList.add('input-error');

      if (!ok) return MyApp.showToast('Preencha todos os campos corretamente.', 'error');

      const actionUrl = form.getAttribute('action');
      if (!actionUrl || actionUrl === '') {
        return MyApp.showToast('O atributo "action" do formulário precisa ter a URL do Formspree.', 'error');
      }

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Enviando...';
      btn.disabled = true;

      try {
        const response = await fetch(actionUrl, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          MyApp.showToast('Mensagem enviada com sucesso! Em breve retornaremos.', 'success');
          form.reset();
        } else {
          MyApp.showToast('Ocorreu um problema ao enviar. Tente novamente mais tarde.', 'error');
        }
      } catch (error) {
        MyApp.showToast('Erro de conexão. Verifique sua internet.', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  };

  /* ========== Acessibilidade ========== */
  MyApp.initAccessibility = () => {
    const btn = $('#btnA11y'), panel = $('#a11yPanel');
    if (!btn || !panel) return;
    const STORAGE_KEY = 'advic-a11y', closeBtn = panel.querySelector('[data-a11y-close]'), actions = panel.querySelectorAll('[data-a11y-action]');
    let lastFocus = null;
    const baseState = { fontScale: 1, highContrast: false, reduceMotion: false };
    const loadState = () => {
      try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...baseState, ...JSON.parse(raw) } : { ...baseState }; } 
      catch { return { ...baseState }; }
    };
    const state = loadState();
    const saveState = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };
    const applyState = () => {
      document.body.style.fontSize = `${Math.round(state.fontScale * 100)}%`;
      document.body.classList.toggle('a11y-high-contrast', state.highContrast);
      document.body.classList.toggle('a11y-reduce-motion', state.reduceMotion);
    };
    applyState();

    const openPanel = () => {
      panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true');
      lastFocus = document.activeElement;
      const focusable = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (focusable || panel).focus();
    };
    const closePanel = () => {
      panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    let utterance = null;
    const cancelSpeech = () => { if (synth && synth.speaking) synth.cancel(); };
    const readPage = () => {
      if (!synth) return MyApp.showToast('Leitura não suportada neste navegador.', 'error');
      if (synth.speaking) { cancelSpeech(); return MyApp.showToast('Leitura interrompida.', 'info'); }
      const text = (($('#conteudo') || document.body).innerText || '').trim().replace(/\s+/g, ' ');
      if (!text) return;
      utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR';
      synth.speak(utterance); MyApp.showToast('Lendo conteúdo da página…', 'info');
    };

    const handleAction = (action) => {
      switch (action) {
        case 'font-inc': state.fontScale = Math.min(state.fontScale + 0.1, 1.4); applyState(); saveState(); MyApp.showToast('Fonte aumentada.', 'success'); break;
        case 'font-dec': state.fontScale = Math.max(state.fontScale - 0.1, 0.9); applyState(); saveState(); MyApp.showToast('Fonte reduzida.', 'success'); break;
        case 'toggle-contrast': state.highContrast = !state.highContrast; applyState(); saveState(); MyApp.showToast(state.highContrast ? 'Alto contraste ativado.' : 'Alto contraste desativado.', 'info'); break;
        case 'toggle-motion': state.reduceMotion = !state.reduceMotion; applyState(); saveState(); MyApp.showToast(state.reduceMotion ? 'Animações reduzidas.' : 'Animações restauradas.', 'info'); break;
        case 'read-page': readPage(); break;
        case 'reset': cancelSpeech(); state.fontScale = 1; state.highContrast = false; state.reduceMotion = false; applyState(); saveState(); MyApp.showToast('Acessibilidade resetada.', 'info'); break;
      }
    };

    on(btn, 'click', (e) => { e.preventDefault(); panel.classList.contains('open') ? closePanel() : openPanel(); });
    if (closeBtn) on(closeBtn, 'click', (e) => { e.preventDefault(); closePanel(); });
    actions.forEach((btnAction) => { const a = btnAction.dataset.a11yAction; if (a) on(btnAction, 'click', () => handleAction(a)); });
    on(document, 'keydown', (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey) {
        if (e.key === '1') { e.preventDefault(); openPanel(); }
        else if (e.key === '2') { e.preventDefault(); handleAction('toggle-contrast'); }
        else if (e.key === '3') { e.preventDefault(); handleAction('toggle-motion'); }
        else if (e.key === '4') { e.preventDefault(); handleAction('read-page'); }
        else if (e.key === '0') { e.preventDefault(); handleAction('reset'); }
      }
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });
  };

  /* ========== Filtro Eventos ========== */
  MyApp.initEventos = () => {
    const select = $('#filtro-eventos'), cards = $$('[data-evento]');
    if (!select || !cards.length) return;
    on(select, 'change', () => {
      const f = select.value;
      cards.forEach((c) => { c.style.display = (f === 'todos' || c.dataset.tipo === f) ? '' : 'none'; });
    });
  };

  /* ========== Topo ========== */
  MyApp.initTop = () => {
    const btn = $('#btnTop');
    if (!btn) return;
    const toggle = () => btn.classList.toggle('show', window.scrollY > MyApp.config.scrollTopThreshold);
    on(window, 'scroll', toggle, { passive: true }); toggle();
    on(btn, 'click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  };

  /* ========== Prefetch ========== */
  MyApp.prefetch = () => {
    $$('a[href$=".html"]').forEach((a) => {
      a.addEventListener('mouseenter', () => {
        const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'document'; l.href = a.getAttribute('href'); document.head.appendChild(l);
      }, { once: true, passive: true });
    });
  };

  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    MyApp.initPreloader();
    MyApp.Security.enforceHTTPS(); MyApp.Security.hardenLinks(); MyApp.Security.frameBusting(); MyApp.Security.lockConsole(); MyApp.Security.warnInlineHandlers();
    MyApp.initMenu(); MyApp.initSmoothScroll(); MyApp.initLazy(); MyApp.initScrollSpy(); MyApp.initReveal(); MyApp.initTimeline(); MyApp.initContactForm(); MyApp.initEventos(); MyApp.initTop(); MyApp.initAccessibility(); MyApp.prefetch();
    const map = document.querySelector('.mapa-wrapper iframe[data-src]');
    if (map) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          map.src = map.dataset.src; map.removeAttribute('data-src'); obs.unobserve(map);
        });
      });
      io.observe(map);
    }
  });
})();