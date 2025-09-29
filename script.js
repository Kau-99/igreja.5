'use strict';

(() => {
  // =============================
  // 🔧 POLYFILLS & PATCHES LEVES
  // =============================
  // requestIdleCallback polyfill (leve e seguro)
  window.requestIdleCallback = window.requestIdleCallback || function (cb) {
    const start = Date.now();
    return setTimeout(() => cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    }), 1);
  };
  window.cancelIdleCallback = window.cancelIdleCallback || function (id) { clearTimeout(id); };

  // Patch para tornar eventos de scroll/touch passivos por padrão (ganho de fluidez no mobile)
  (function patchPassive() {
    try {
      const supportsPassive = (() => {
        let supported = false;
        const opts = Object.defineProperty({}, 'passive', {
          get() { supported = true; }
        });
        window.addEventListener('testPassive', null, opts);
        window.removeEventListener('testPassive', null, opts);
        return supported;
      })();

      if (!supportsPassive) return;
      const orig = EventTarget.prototype.addEventListener;
      const passiveTypes = new Set(['touchstart','touchmove','wheel']);
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (typeof options === 'object') {
          // respeita opções existentes
          return orig.call(this, type, listener, options);
        }
        // Se não especificou options e é um tipo que bloqueia scroll, usa passive:true
        const usePassive = passiveTypes.has(type) ? { passive: true } : false;
        return orig.call(this, type, listener, usePassive);
      };
    } catch {}
  })();

  // =============================
  // 🛡️ SECURITY HARDENING
  // =============================
  const Security = (() => {
    const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

    function sanitizeURL(href) {
      try {
        const u = new URL(href, location.href);
        if (!SAFE_SCHEMES.includes(u.protocol)) return '#';
        return u.href;
      } catch {
        return '#';
      }
    }

    function hardenLinks() {
      document.querySelectorAll('a').forEach(a => {
        // bloqueia javascript:/data: injetado
        if (a.hasAttribute('href')) {
          const clean = sanitizeURL(a.getAttribute('href'));
          if (clean === '#') a.removeAttribute('href'); else a.setAttribute('href', clean);
        }
        // reforça noopener em novas abas
        if (a.target === '_blank') {
          const rel = (a.getAttribute('rel') || '').split(/\s+/);
          if (!rel.includes('noopener')) rel.push('noopener');
          if (!rel.includes('noreferrer')) rel.push('noreferrer');
          a.setAttribute('rel', rel.join(' ').trim());
        }
      });
    }

    function frameBust() {
      // Ideal é via cabeçalho (CSP / X-Frame-Options). JS é fallback.
      try { if (self !== top) top.location = self.location; } catch {}
    }

    function silenceLogsInProd() {
      const isProd = (window.ENVIRONMENT || 'production').toLowerCase() === 'production';
      if (!isProd) return;
      // Mantém warn/error, silencia debug/info para não poluir e não custar tempo de IO
      console.debug = () => {};
      console.info  = () => {};
    }

    return { hardenLinks, frameBust, silenceLogsInProd };
  })();

  // =============================
  // ⚡ PERFORMANCE HELPERS
  // =============================
  const Perf = (() => {
    const preconnected = new Set();

    function preconnect(url) {
      try {
        const u = new URL(url, location.href);
        const origin = u.origin;
        if (preconnected.has(origin)) return;
        preconnected.add(origin);
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = '';
        document.head.appendChild(link);
      } catch {}
    }

    function warmCommonCDNs() {
      [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com'
      ].forEach(preconnect);
    }

    // Prefetch ao pairar: navegação imediata entre páginas internas
    function prefetchOnHover() {
      const links = document.querySelectorAll('a[href$=".html"]');
      links.forEach(a => {
        a.addEventListener('mouseenter', () => {
          const href = a.getAttribute('href');
          if (!href) return;
          const l = document.createElement('link');
          l.rel = 'prefetch';
          l.href = href;
          l.as = 'document';
          document.head.appendChild(l);
        }, { once: true, passive: true });
      });
    }

    return { warmCommonCDNs, prefetchOnHover, preconnect };
  })();

  // =============================
  // 🧭 MODO ADAPTATIVO (LOW-END)
  // =============================
  const Device = (() => {
    const saveData = navigator.connection && navigator.connection.saveData;
    const lowMem = (navigator.deviceMemory && navigator.deviceMemory <= 2);
    const lowCPU = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowEndMode = !!(saveData || lowMem || lowCPU || prefersReducedMotion);

    function applyLowEndHints() {
      if (!lowEndMode) return;
      document.documentElement.dataset.lowend = '1';
      // Desliga animações CSS de forma não destrutiva
      const style = document.createElement('style');
      style.textContent = `
        [data-lowend="1"] *, [data-lowend="1"] *::before, [data-lowend="1"] *::after {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      `.replaceAll('[data-lowend="1"]', 'html[data-lowend="1"]');
      document.head.appendChild(style);
    }

    return { lowEndMode, applyLowEndHints };
  })();

  // =============================
  // 🔍 NAMESPACE ORIGINAL + UPGRADES
  // =============================
  const MyApp = {}; // Namespace global seguro (mantido)

  /** =============================
   * 🌐 Configurações
   * ============================= */
  MyApp.config = {
    ENV: (window.ENVIRONMENT || 'production').toLowerCase(),
    scrollTopThreshold: 300,
    toastDuration: 3000,
    timelineThreshold: Device.lowEndMode ? 0.1 : 0.5,          // mais permissivo em aparelhos fracos
    timelineHighlightThreshold: Device.lowEndMode ? 0.5 : 0.6,
    lazySelector: 'img[data-src], [data-lazy], iframe[data-src]',
    modalSelector: '.modal',
    toastQueueDelay: 300, // delay entre toasts
    lowEndMode: Device.lowEndMode
  };

  /** =============================
   * 🔍 Logger 
   * ============================= */
  MyApp.Logger = {
    _ts: () => new Date().toISOString(),
    debug: (...args) => MyApp.config.ENV === 'development' && console.debug(`[DEBUG ${MyApp.Logger._ts()}]`, ...args),
    info:  (...args) => MyApp.config.ENV === 'development' && console.info(`[INFO ${MyApp.Logger._ts()}]`, ...args),
    warn:  (...args) => console.warn(`[WARN ${MyApp.Logger._ts()}]`, ...args),
    error: (...args) => console.error(`[ERROR ${MyApp.Logger._ts()}]`, ...args)
  };

  /** =============================
   *  Utilitários
   * ============================= */
  MyApp.on = (el, evt, fn, opts = false) => el?.addEventListener(evt, fn, opts);

  MyApp.debounce = (fn, delay = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  MyApp.throttle = (fn, limit = 200) => {
    let lastFunc, lastRan;
    return (...args) => {
      if (!lastRan) {
        fn.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            fn.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  };

  /** =============================
   *  Menu Responsivo
   * ============================= */
  MyApp.initMenu = () => {
    try {
      const toggle = document.querySelector('.nav-toggle');
      const nav = document.querySelector('.nav-wrapper');
      if (!toggle || !nav) return;

      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu de navegação');

      MyApp.on(toggle, 'click', () => {
        const isOpen = toggle.classList.toggle('open');
        nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
      });

      MyApp.on(document, 'keydown', (e) => {
        if (e.key === 'Escape' && toggle.classList.contains('open')) {
          toggle.classList.remove('open');
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    } catch (err) {
      MyApp.Logger.error('Erro ao inicializar menu:', err);
    }
  };

  /** =============================
   *  Scroll Suave
   * ============================= */
  MyApp.initSmoothScroll = () => {
    try {
      // Em modo low-end, evita smooth para não travar
      if (MyApp.config.lowEndMode) return;
      document.querySelectorAll('a[href^="#"]').forEach(link => {
        MyApp.on(link, 'click', (e) => {
          const target = document.querySelector(link.getAttribute('href'));
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        });
      });
    } catch (err) {
      MyApp.Logger.error('Erro no scroll suave:', err);
    }
  };

  /** =============================
   *  Toast com fila
   * ============================= */
  MyApp.toastQueue = [];
  MyApp.toastActive = false;

  MyApp.showToast = (message, type = 'info') => {
    // Sanitiza texto (simples) para evitar HTML injection
    const safe = String(message).replace(/[<>&"]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[s]));
    MyApp.toastQueue.push({ message: safe, type });
    if (!MyApp.toastActive) MyApp._processToastQueue();
  };

  MyApp._processToastQueue = () => {
    if (!MyApp.toastQueue.length) {
      MyApp.toastActive = false;
      return;
    }
    MyApp.toastActive = true;
    const { message, type } = MyApp.toastQueue.shift();
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
        setTimeout(MyApp._processToastQueue, MyApp.config.toastQueueDelay);
      }, { once: true });
    }, MyApp.config.toastDuration);
  };

  /** =============================
   *  Formulário de Contato Seguro
   * ============================= */
  MyApp.initContactForm = () => {
    try {
      const form = document.querySelector('.contact-form');
      if (!form) return;

      MyApp.on(form, 'submit', async (e) => {
        if (/formspree\.io|formspark|getform|staticforms/.test(form.action)) return;
        e.preventDefault();

        // Honeypot check (anti-bot)
        const honeypot = form.querySelector('.honeypot');
        if (honeypot && honeypot.value.trim() !== '') {
          MyApp.Logger.warn('Formulário bloqueado pelo honeypot.');
          return;
        }

        const nome = form.querySelector('#nome');
        const email = form.querySelector('#email');
        const assunto = form.querySelector('#assunto') || { value: 'Contato' };
        const mensagem = form.querySelector('#mensagem');

        const isValid = [
          { el: nome, valid: !!nome?.value.trim() },
          { el: email, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.value) },
          { el: assunto, valid: !!assunto?.value.trim() },
          { el: mensagem, valid: !!mensagem?.value.trim() }
        ].every(({ el, valid }) => {
          el?.classList.toggle('input-error', !valid);
          return valid;
        });

        if (!isValid) {
          MyApp.showToast('Por favor, preencha todos os campos corretamente.', 'error');
          return;
        }

        // reCAPTCHA v3 (opcional)
        if (window.grecaptcha) {
          try {
            const token = await grecaptcha.execute('SEU_SITE_KEY', { action: 'submit' });
            MyApp.Logger.info('Token reCAPTCHA obtido:', token);
          } catch (err) {
            MyApp.Logger.warn('Falha no reCAPTCHA', err);
          }
        }

        MyApp.showToast('Mensagem enviada com sucesso!', 'success');
        form.reset();
      });
    } catch (err) {
      MyApp.Logger.error('Erro ao inicializar formulário:', err);
    }
  };

  /** =============================
   *  Linha do Tempo (com fallback)
   * ============================= */
  MyApp.initTimeline = () => {
    try {
      const items = document.querySelectorAll('.timeline .timeline-item');
      if (!items.length) return;

      // Fallback sem IntersectionObserver (navegadores bem antigos)
      if (!('IntersectionObserver' in window)) {
        items.forEach(i => i.classList.add('show'));
        return;
      }

      if (MyApp.config.lowEndMode) {
        // Em aparelhos fracos, só revela sem observers de destaque
        items.forEach(i => i.classList.add('show'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('show');
        });
      }, { threshold: MyApp.config.timelineThreshold });

      const highlightObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            items.forEach(i => i.classList.remove('highlight'));
            entry.target.classList.add('highlight');
          }
        });
      }, { threshold: MyApp.config.timelineHighlightThreshold });

      items.forEach(item => {
        observer.observe(item);
        highlightObserver.observe(item);
      });
    } catch (err) {
      MyApp.Logger.error('Erro ao inicializar timeline:', err);
    }
  };

  /** =============================
   *  Botão Voltar ao Topo 
   * ============================= */
  MyApp.initScrollTopButton = () => {
    try {
      const btnTop = document.getElementById('btnTop');
      if (!btnTop) return;

      const toggleVisibility = MyApp.throttle(() => {
        btnTop.classList.toggle('show', window.scrollY > MyApp.config.scrollTopThreshold);
      }, 100);

      window.addEventListener('scroll', toggleVisibility, { passive: true });

      MyApp.on(btnTop, 'click', (e) => {
        e.preventDefault();
        if (MyApp.config.lowEndMode) { window.scrollTo(0, 0); return; }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (err) {
      MyApp.Logger.error('Erro no botão scroll top:', err);
    }
  };

  /** =============================
   *  Lazy Load de Imagens, iFrames e BGs
   * ============================= */
  MyApp.initLazyLoad = () => {
    try {
      const lazyItems = document.querySelectorAll(MyApp.config.lazySelector);
      if (!lazyItems.length) return;

      // Fallback sem IO: carrega tudo de uma vez (com cuidado)
      if (!('IntersectionObserver' in window)) {
        lazyItems.forEach(setLazySrc);
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setLazySrc(entry.target, observer);
          }
        });
      }, { threshold: 0.1 });

      lazyItems.forEach(item => observer.observe(item));

      function setLazySrc(el, obs) {
        const finish = () => { 
          el.removeAttribute('data-src'); 
          obs && obs.unobserve(el); 
        };
        if (el.tagName === 'IMG' || el.tagName === 'IFRAME') {
          const src = el.dataset.src;
          if (!src) return finish();
          // decode() melhora o paint suave quando disponível
          el.src = src;
          if ('decode' in el && el.tagName === 'IMG') {
            el.decode().catch(()=>{}).finally(finish);
          } else {
            el.addEventListener('load', finish, { once: true });
            el.addEventListener('error', () => { el.style.display = 'none'; finish(); }, { once: true });
          }
        } else {
          const src = el.dataset.lazy;
          if (src) el.style.backgroundImage = `url(${src})`;
          finish();
        }
      }
    } catch (err) {
      MyApp.Logger.error('Erro no lazy load:', err);
    }
  };

  /** =============================
   *  ScrollSpy - ativa link do menu
   * ============================= */
  MyApp.initScrollSpy = () => {
    try {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
      if (!sections.length || !navLinks.length) return;
      if (MyApp.config.lowEndMode || !('IntersectionObserver' in window)) return; // pula em low-end

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-menu a[href="#${entry.target.id}"]`);
            if (activeLink) activeLink.classList.add('active');
          }
        });
      }, { threshold: 0.6 });

      sections.forEach(section => observer.observe(section));
    } catch (err) {
      MyApp.Logger.error('Erro no ScrollSpy:', err);
    }
  };

  /** =============================
   *  Animação de contadores numéricos
   * ============================= */
  MyApp.animateCounters = () => {
    try {
      if (MyApp.config.lowEndMode) return; // evita CPU em aparelhos fracos
      const counters = document.querySelectorAll('[data-counter]');
      if (!counters.length) return;

      if (!('IntersectionObserver' in window)) {
        // Sem IO: só fixa o valor final
        counters.forEach(el => { el.textContent = el.dataset.counter || '0'; });
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = +el.dataset.counter || 0;
            let count = 0;
            const step = Math.max(1, Math.ceil(target / 100));
            const interval = setInterval(() => {
              count += step;
              el.textContent = Math.min(count, target);
              if (count >= target) clearInterval(interval);
            }, 20);
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.6 });

      counters.forEach(c => observer.observe(c));
    } catch (err) {
      MyApp.Logger.error('Erro na animação de contadores:', err);
    }
  };

  /** =============================
   *  Inicialização Completa + Hardening
   * ============================= */
  MyApp.init = () => {
    // Segurança & adaptações primeiro
    Security.silenceLogsInProd();
    Security.frameBust();
    Device.applyLowEndHints();

    // Performance: aquece conexões e pré-carrega rotas internas
    Perf.warmCommonCDNs();
    requestIdleCallback(Perf.prefetchOnHover);

    // Inicializações UI
    MyApp.initMenu();
    MyApp.initSmoothScroll();
    MyApp.initContactForm();
    MyApp.initTimeline();
    MyApp.initScrollTopButton();
    MyApp.initLazyLoad();
    MyApp.initScrollSpy();
    MyApp.animateCounters();

    // Pós-DOM: sanitize de links (previne injection em runtime)
    requestIdleCallback(Security.hardenLinks);

    MyApp.Logger.info('Scripts iniciais carregados com sucesso.');
  };

  document.addEventListener('DOMContentLoaded', MyApp.init);
})();
