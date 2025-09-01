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
    lazySelector: 'img[data-src], [data-lazy]',
    modalSelector: '.modal',
    toastQueueDelay: 300 // delay entre toasts
  };

  /** =============================
   * 🔍 Logger 
   * ============================= */
  MyApp.Logger = {
    _ts: () => new Date().toISOString(),
    debug: (...args) => MyApp.config.ENV === 'development' && console.debug(`[DEBUG ${MyApp.Logger._ts()}]`, ...args),
    info: (...args) => console.info(`[INFO ${MyApp.Logger._ts()}]`, ...args),
    warn: (...args) => console.warn(`[WARN ${MyApp.Logger._ts()}]`, ...args),
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

      MyApp.on(form, 'submit', (e) => {
        if (/formspree\.io|formspark|getform|staticforms/.test(form.action)) return;

        e.preventDefault();

        const nome = form.querySelector('#nome');
        const email = form.querySelector('#email');
        const mensagem = form.querySelector('#mensagem');

        const isValid = [
          { el: nome, valid: !!nome?.value.trim() },
          { el: email, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.value) },
          { el: mensagem, valid: !!mensagem?.value.trim() }
        ].every(({ el, valid }) => {
          el?.classList.toggle('input-error', !valid);
          return valid;
        });

        if (!isValid) {
          MyApp.showToast('Por favor, preencha todos os campos corretamente.', 'error');
          return;
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
        btnTop.style.display = window.scrollY > MyApp.config.scrollTopThreshold ? 'block' : 'none';
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
   *  Lazy Load de Imagens e Modais
   * ============================= */
  MyApp.initLazyLoad = () => {
    try {
      const lazyItems = document.querySelectorAll(MyApp.config.lazySelector);
      if (!lazyItems.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            if (el.tagName === 'IMG') {
              el.src = el.dataset.src;
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
   *  Inicialização Completa
   * ============================= */
  MyApp.init = () => {
    MyApp.initMenu();
    MyApp.initSmoothScroll();
    MyApp.initContactForm();
    MyApp.initTimeline();
    MyApp.initScrollTopButton();
    MyApp.initLazyLoad();
    MyApp.Logger.info('Scripts iniciais carregados com sucesso.');
  };

  document.addEventListener('DOMContentLoaded', MyApp.init);

})();
