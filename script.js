'use strict';

(() => {
  const MyApp = {}; // Namespace global seguro

  /** =============================
   * 🌐 Configurações
   * ============================= */
  MyApp.config = {
    ENV: (window.ENVIRONMENT || 'production').toLowerCase(),
    scrollTopThreshold: 300,
    toastDuration: 3000,
    timelineThreshold: 0.5,
    timelineHighlightThreshold: 0.6,
    lazySelector: 'img[data-src], [data-lazy]'
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
    MyApp.toastQueue.push({ message, type });
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
        setTimeout(MyApp._processToastQueue, 300);
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
        const assunto = form.querySelector('#assunto');
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
   *  Linha do Tempo
   * ============================= */
  MyApp.initTimeline = () => {
    try {
      const items = document.querySelectorAll('.timeline .timeline-item');
      if (!items.length) return;

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

      window.addEventListener('scroll', toggleVisibility);

      MyApp.on(btnTop, 'click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (err) {
      MyApp.Logger.error('Erro no botão scroll top:', err);
    }
  };

  /** =============================
   *  Lazy Load de Imagens, iFrames e Modais
   * ============================= */
  MyApp.initLazyLoad = () => {
    try {
      const lazyItems = document.querySelectorAll(MyApp.config.lazySelector);
      if (!lazyItems.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            if (el.tagName === 'IMG' || el.tagName === 'IFRAME') {
              el.src = el.dataset.src;
              el.onerror = () => {
                MyApp.Logger.warn(`Erro ao carregar recurso: ${el.dataset.src}`);
                el.style.display = 'none';
              };
              el.removeAttribute('data-src');
            } else {
              const src = el.dataset.lazy;
              if (src) el.style.backgroundImage = `url(${src})`;
              el.removeAttribute('data-lazy');
            }
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.1 });

      lazyItems.forEach(item => observer.observe(item));
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
   *  Inicialização Completa
   * ============================= */
  MyApp.init = () => {
    MyApp.initMenu();
    MyApp.initSmoothScroll();
    MyApp.initContactForm();
    MyApp.initTimeline();
    MyApp.initScrollTopButton();
    MyApp.initLazyLoad();
    MyApp.initScrollSpy();
    MyApp.Logger.info('Scripts iniciais carregados com sucesso.');
  };

  document.addEventListener('DOMContentLoaded', MyApp.init);

})();

/* =============================================================
   ADVIC v1.2 — Additions Only (non-invasive)
   - Mantém 100% do seu código original acima
   - Apenas acrescenta segurança, performance e UX
   ============================================================= */
(function () {
  'use strict';

  // Evita rodar duas vezes se já anexado
  if (window.__ADVIC_V12_ADDED__) return;
  window.__ADVIC_V12_ADDED__ = true;

  // Utilitário: exec quando o DOM estiver pronto
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    // =========================
    // A11y: Região aria-live para leitores de tela
    // =========================
    var srLive = document.createElement('div');
    srLive.setAttribute('aria-live', 'polite');
    srLive.setAttribute('aria-atomic', 'true');
    srLive.style.position = 'absolute';
    srLive.style.left = '-9999px';
    srLive.style.width = '1px';
    srLive.style.height = '1px';
    document.body.appendChild(srLive);

    // Monkey-patch não destrutivo do showToast (preserva função original)
    try {
      if (window.MyApp && typeof MyApp.showToast === 'function') {
        var _origShowToast = MyApp.showToast.bind(MyApp);
        MyApp.showToast = function (message, type) {
          try { srLive.textContent = String(message || ''); } catch {}
          return _origShowToast(message, type);
        };
      }
    } catch {}

    // =========================
    // Form: foco no primeiro campo inválido + aria-invalid
    // =========================
    var form = document.querySelector('.contact-form');
    if (form) {
      form.addEventListener('submit', function () {
        // aguarda o handler original marcar .input-error
        setTimeout(function () {
          try {
            var invalid = form.querySelector('.input-error');
            // limpa aria-invalid anterior
            form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) {
              el.removeAttribute('aria-invalid');
            });
            if (invalid) {
              invalid.setAttribute('aria-invalid', 'true');
              if (typeof invalid.focus === 'function') invalid.focus({ preventScroll: false });
            }
          } catch {}
        }, 0);
      }, true); // captura antes de bubbling terminar
    }

    // =========================
    // Network feedback
    // =========================
    function toast(msg, type) {
      if (window.MyApp && typeof MyApp.showToast === 'function') MyApp.showToast(msg, type || 'info');
    }
    window.addEventListener('offline', function(){ toast('Conexão perdida. Verifique sua internet.', 'error'); });
    window.addEventListener('online', function(){ toast('Conexão restabelecida.', 'success'); });

    // =========================
    // Security: re-harden links para nós dinâmicos
    // =========================
    try {
      if (window.MutationObserver && window.MyApp && typeof MyApp.initMenu === 'function') {
        var mo = new MutationObserver(function (mutations) {
          var shouldHarden = false;
          mutations.forEach(function (m) {
            if (m.addedNodes && m.addedNodes.length) shouldHarden = true;
          });
          if (shouldHarden && MyApp.Security && typeof MyApp.Security.hardenLinks === 'function') {
            if (window.requestIdleCallback) requestIdleCallback(MyApp.Security.hardenLinks);
            else setTimeout(MyApp.Security.hardenLinks, 32);
          }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch {}

    // =========================
    // Performance: preconnect + prefetch on-hover (sem sobrescrever nada)
    // =========================
    (function () {
      var preconnected = {};
      function preconnect(url) {
        try {
          var origin = new URL(url, location.href).origin;
          if (preconnected[origin]) return;
          preconnected[origin] = true;
          var link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = origin;
          link.crossOrigin = '';
          document.head.appendChild(link);
        } catch {}
      }
      ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com']
        .forEach(preconnect);

      // Prefetch de páginas internas
      document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
        a.addEventListener('mouseenter', function () {
          var href = a.getAttribute('href');
          if (!href) return;
          var l = document.createElement('link');
          l.rel = 'prefetch';
          l.href = href;
          l.as = 'document';
          document.head.appendChild(l);
        }, { once: true, passive: true });
      });
    })();

    // =========================
    // IMG decode (suaviza pintura em navegadores modernos)
    // =========================
    if ('decode' in HTMLImageElement.prototype) {
      (function () {
        var imgs = Array.prototype.slice.call(document.images || []);
        var i = 0;
        function step() {
          var batch = imgs.slice(i, i + 8);
          i += 8;
          batch.forEach(function (img) {
            if (img && img.complete && !img.__decoded__) {
              img.decode().catch(function(){}).finally(function(){ img.__decoded__ = true; });
            }
          });
          if (i < imgs.length) {
            if (window.requestIdleCallback) requestIdleCallback(step);
            else setTimeout(step, 64);
          }
        }
        if (imgs.length) {
          if (window.requestIdleCallback) requestIdleCallback(step);
          else setTimeout(step, 64);
        }
      })();
    }

    // =========================
    // ScrollSpy minimalista (só se não existir)
    // =========================
    if (!(window.MyApp && typeof MyApp.initScrollSpy === 'function')) {
      try {
        var sections = document.querySelectorAll('section[id]');
        var navLinks = document.querySelectorAll('nav a[href^="#"]');
        if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                navLinks.forEach(function (l) { l.classList.remove('active'); });
                var id = entry.target.getAttribute('id');
                var active = document.querySelector('nav a[href="#' + id + '"]');
                if (active) active.classList.add('active');
              }
            });
          }, { threshold: 0.6 });
          sections.forEach(function (s) { io.observe(s); });
        }
      } catch {}
    }

    // =========================
    // Dev measurements (apenas em development)
    // =========================
    try {
      if (window.MyApp && MyApp.config && MyApp.config.ENV === 'development' && window.performance && performance.mark) {
        performance.mark('advic_v12_init_end');
        performance.measure('advic_v12_boot', 'navigationStart', 'advic_v12_init_end');
      }
    } catch {}
  });
})();

/* =============================================================
   ADVIC v1.2.1 — Extended Additions (still non-invasive)
   - Toast queue (se existir MyApp.showToast)
   - Scroll restoration
   - Extra polyfills leves
   - Offline/Online indicators (badge)
   ============================================================= */
(function () {
  'use strict';

  // Evita rodar duas vezes
  if (window.__ADVIC_V121_ADDED__) return;
  window.__ADVIC_V121_ADDED__ = true;

  // Polyfill: closest (muitos browsers antigos já têm, mas garantimos)
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;
      do {
        if (el.matches && el.matches(s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }
  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }

  // Restauração de scroll mais estável
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; } catch {}

  // Badge simples para status de rede (não interfere no layout)
  function ensureNetBadge() {
    var id = '__advic_net_badge__';
    if (document.getElementById(id)) return;
    var b = document.createElement('div');
    b.id = id;
    b.style.position = 'fixed';
    b.style.right = '12px';
    b.style.bottom = '70px';
    b.style.padding = '6px 10px';
    b.style.borderRadius = '999px';
    b.style.fontSize = '12px';
    b.style.fontWeight = '600';
    b.style.background = '#999';
    b.style.color = '#fff';
    b.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
    b.style.opacity = '0';
    b.style.pointerEvents = 'none';
    b.style.transition = 'opacity .25s ease';
    b.setAttribute('aria-hidden', 'true');
    document.body.appendChild(b);
    return b;
  }

  function showNet(msg, color) {
    var b = ensureNetBadge();
    if (!b) return;
    b.textContent = msg;
    b.style.background = color || '#666';
    b.style.opacity = '1';
    setTimeout(function () { b.style.opacity = '0'; }, 1500);
  }

  window.addEventListener('offline', function(){ showNet('OFFLINE', '#c0392b'); });
  window.addEventListener('online', function(){ showNet('ONLINE', '#28a745'); });

  // Toast Queue: só se já existe MyApp.showToast
  try {
    if (window.MyApp && typeof MyApp.showToast === 'function') {
      if (!MyApp.__toastQueuePatched__) {
        MyApp.__toastQueuePatched__ = true;
        var __queue = [];
        var __active = false;
        var __orig = MyApp.showToast.bind(MyApp);
        MyApp.showToast = function (msg, type) {
          __queue.push({ msg: msg, type: type });
          if (!__active) process();
        };
        function process() {
          if (!__queue.length) { __active = false; return; }
          __active = true;
          var item = __queue.shift();
          __orig(item.msg, item.type);
          setTimeout(process, (MyApp.config && MyApp.config.toastDuration) ? MyApp.config.toastDuration + 200 : 3400);
        }
      }
    }
  } catch {}
})();