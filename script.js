"use strict";
(() => {
  const MyApp = (window.MyApp = window.MyApp || {});

  MyApp.config = {
    ENV: (window.ENVIRONMENT || "production").toLowerCase(),
    scrollTopThreshold: 260,
    toastDuration: 4000,
    lazySelector: "img[data-src], .lazy[data-src], [data-lazy], iframe[data-src]",
    // URL do canal para o banner de transmissão ao vivo
    liveUrl: "https://www.youtube.com/@advicof",
    // Agendamento da transmissão ao vivo: 0=Domingo, 18h–20h
    liveSchedule: { dayOfWeek: 0, startHour: 18, endHour: 20 },
  };

  // Cache central — evita buscar o mesmo JSON duas vezes
  MyApp.Cache = {};

  MyApp.log = (...a) =>
    MyApp.config.ENV === "development" ? console.log("[ADVIC]", ...a) : 0;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  const escapeHTML = (str) => {
    if (typeof str !== "string") return str;
    return str.replace(
      /[&<>'"]/g,
      (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[tag],
    );
  };

  // ─── BUSCA JSON COM CACHE E TIMEOUT ─────────────────────────────────────
  MyApp.fetchJSON = async (url, timeoutMs = 8000) => {
    if (MyApp.Cache[url]) return MyApp.Cache[url];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Falha HTTP: ${response.status}`);
      const data = await response.json();
      MyApp.Cache[url] = data;
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Tempo esgotado ao carregar dados.");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  // ─── SEGURANÇA ────────────────────────────────────────────────────────────
  MyApp.Security = {
    hardenLinks() {
      $$("a[href]").forEach((a) => {
        const raw = (a.getAttribute("href") || "").trim();
        if (!raw) return;
        if (/^\s*(javascript|data):/i.test(raw)) {
          a.removeAttribute("href");
          a.setAttribute("role", "link");
          a.dataset.blockedHref = "blocked";
          return;
        }
        if (
          raw.startsWith("#") ||
          raw.toLowerCase().startsWith("mailto:") ||
          raw.toLowerCase().startsWith("tel:")
        ) return;
        try {
          const url = new URL(raw, window.location.origin);
          if (url.origin !== window.location.origin) {
            a.setAttribute("target", "_blank");
            const rel = (a.getAttribute("rel") || "").split(/\s+/);
            if (!rel.includes("noopener")) rel.push("noopener");
            if (!rel.includes("noreferrer")) rel.push("noreferrer");
            a.setAttribute("rel", rel.join(" ").trim());
          }
        } catch { /* URL inválida, ignora */ }
      });
    },
    frameBusting() {
      try {
        if (window.top !== window.self && !document.body.classList.contains("allow-embed")) {
          window.top.location = window.location;
        }
      } catch { /* cross-origin */ }
    },
    enforceHTTPS() {
      if (
        window.location.protocol === "http:" &&
        !/^localhost$/i.test(window.location.hostname) &&
        !/^127\.0\.0\.1$/.test(window.location.hostname)
      ) {
        window.location.replace(
          `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      }
    },
    lockConsole() {
      if (MyApp.config.ENV !== "production") return;
      ["log", "debug", "info", "trace"].forEach((m) => {
        try { console[m] = () => {}; } catch { /* protegido */ }
      });
    },
    warnInlineHandlers() {
      if (MyApp.config.ENV !== "development") return;
      const hasInline = $$("*").filter((el) =>
        Array.from(el.attributes).some((attr) => /^on/i.test(attr.name)),
      );
      if (hasInline.length) MyApp.log("Elementos com handlers inline encontrados.", hasInline);
    },
  };

  // ─── PRELOADER ────────────────────────────────────────────────────────────
  MyApp.initPreloader = () => {
    const preloader = $("#preloader");
    if (!preloader) return;
    const start = window.performance?.now?.() || Date.now();
    document.body.classList.add("preloader-active");

    let hidden = false;
    const hidePreloader = () => {
      if (hidden) return;
      hidden = true;
      const elapsed = (window.performance?.now?.() || Date.now()) - start;
      setTimeout(() => {
        preloader.classList.add("preloader--hidden");
        document.body.classList.remove("preloader-active");
        setTimeout(() => preloader?.parentNode?.removeChild(preloader), 600);
      }, Math.max(0, 600 - elapsed));
    };

    window.addEventListener("load", hidePreloader);
    setTimeout(hidePreloader, 8000);
  };

  // ─── MENU ─────────────────────────────────────────────────────────────────
  MyApp.initMenu = () => {
    const toggle = $(".nav-toggle");
    const nav = $(".nav-wrapper");
    const links = $$(".nav-menu a");
    if (!toggle || !nav) return;

    const toggleMenu = (forceState) => {
      const isOpen =
        typeof forceState === "boolean" ? forceState : !toggle.classList.contains("open");
      toggle.classList.toggle("open", isOpen);
      nav.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    };

    on(toggle, "click", (e) => { e.stopPropagation(); toggleMenu(); });
    links.forEach((link) => on(link, "click", () => toggleMenu(false)));
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && toggle.classList.contains("open")) {
        toggleMenu(false);
        toggle.focus();
      }
    });
    on(document, "click", (e) => {
      if (toggle.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) {
        toggleMenu(false);
      }
    });
  };

  // ─── SMOOTH SCROLL ────────────────────────────────────────────────────────
  MyApp.initSmoothScroll = () => {
    $$('a[href^="#"]:not(.open-ministry-modal):not(.accordion-button)').forEach((link) => {
      on(link, "click", (e) => {
        const target = $(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  };

  // ─── TOAST ────────────────────────────────────────────────────────────────
  const toastQueue = [];
  let activeToast = false;

  MyApp.showToast = (message = "", type = "info") => {
    toastQueue.push({ message: String(message), type });
    if (!activeToast) processToastQueue();
  };

  function processToastQueue() {
    if (!toastQueue.length) return (activeToast = false);
    activeToast = true;
    const { message, type } = toastQueue.shift();
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => {
        toast.remove();
        setTimeout(processToastQueue, 180);
      }, { once: true });
    }, MyApp.config.toastDuration);
  }

  // ─── OBSERVER POOL ────────────────────────────────────────────────────────
  // Cada tipo de observação usa um único IntersectionObserver singleton.
  // Novos elementos são registados com observeX() em vez de criar um observer novo.

  let _lazyObserver = null;
  let _revealObserver = null;
  let _timelineObserver = null;
  let _scrollSpyObserver = null;

  const getLazyObserver = () => {
    if (_lazyObserver) return _lazyObserver;
    _lazyObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const src = el.dataset.src || el.dataset.lazy;
        if (!src || /^\s*javascript:/i.test(src)) return obs.unobserve(el);
        if (el.tagName === "IMG" || el.tagName === "IFRAME") el.src = src;
        else el.style.backgroundImage = `url(${src})`;
        el.removeAttribute("data-src");
        el.removeAttribute("data-lazy");
        el.classList.remove("lazy");
        obs.unobserve(el);
      });
    }, { threshold: 0.12 });
    return _lazyObserver;
  };

  const getRevealObserver = () => {
    if (_revealObserver) return _revealObserver;
    _revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        setTimeout(
          () => en.target.classList.add("in"),
          parseInt(en.target.dataset.delay || "0", 10),
        );
        obs.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    return _revealObserver;
  };

  const getTimelineObserver = () => {
    if (_timelineObserver) return _timelineObserver;
    _timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add("show");
      });
    }, { threshold: 0.4 });
    return _timelineObserver;
  };

  const getScrollSpyObserver = () => {
    if (_scrollSpyObserver) return _scrollSpyObserver;
    _scrollSpyObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          $$(".nav-menu a").forEach((l) => l.classList.remove("active"));
          $(`.nav-menu a[href="#${en.target.id}"]`)?.classList.add("active");
        }
      });
    }, { threshold: 0.6 });
    return _scrollSpyObserver;
  };

  // Registra elementos lazy no observer singleton (pode ser chamado múltiplas vezes)
  MyApp.registerLazyElements = (elements) => {
    if (!("IntersectionObserver" in window)) return;
    const obs = getLazyObserver();
    elements.forEach((el) => obs.observe(el));
  };

  // Registra elementos de reveal no observer singleton
  MyApp.registerRevealElements = (elements) => {
    if (!("IntersectionObserver" in window)) return;
    const obs = getRevealObserver();
    elements.forEach((el) => obs.observe(el));
  };

  MyApp.initLazy = () => MyApp.registerLazyElements($$(MyApp.config.lazySelector));
  MyApp.initReveal = () => MyApp.registerRevealElements($$("[data-animate]"));

  MyApp.initScrollSpy = () => {
    const sections = $$("section[id]");
    const links = $$('.nav-menu a[href^="#"]');
    if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;
    const obs = getScrollSpyObserver();
    sections.forEach((s) => obs.observe(s));
  };

  MyApp.initTimeline = () => {
    const items = $$(".timeline .timeline-item");
    if (!items.length || !("IntersectionObserver" in window)) return;
    const obs = getTimelineObserver();
    items.forEach((i) => obs.observe(i));
  };

  // ─── FORMULÁRIO DE CONTATO ────────────────────────────────────────────────
  MyApp.initContactForm = () => {
    const form = $(".contact-form");
    if (!form) return;

    ["input", "blur"].forEach((ev) => {
      on(form, ev, (e) => {
        const t = e.target;
        if (t.matches("input, textarea"))
          t.classList.toggle("input-error", !t.checkValidity() || !t.value.trim());
      }, true);
    });

    on(form, "submit", async (e) => {
      e.preventDefault();
      const honeypot = $(".honeypot", form);
      if (honeypot?.value.trim()) return;

      const inputs = [$("#nome"), $("#email"), $("#assunto"), $("#mensagem")];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let isValid = true;

      inputs.forEach((el) => {
        if (!el) return;
        const val = el.value.trim();
        const ok = el.id === "email" ? emailRegex.test(val) : !!val;
        el.classList.toggle("input-error", !ok);
        if (!ok) isValid = false;
      });

      if (!isValid) return MyApp.showToast("Preencha todos os campos corretamente.", "error");

      const btn = $('button[type="submit"]', form);
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>A enviar...';
      btn.disabled = true;

      try {
        const formData = new FormData(form);
        if (!formData.has("form-name")) formData.append("form-name", form.getAttribute("name"));
        const res = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(formData).toString(),
        });
        if (res.ok) {
          MyApp.showToast("Mensagem enviada com sucesso!", "success");
          form.reset();
        } else {
          throw new Error("Falha no envio");
        }
      } catch (erro) {
        MyApp.log(erro);
        MyApp.showToast("Erro de conexão. Tente novamente.", "error");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  };

  // ─── MODAIS DE MINISTÉRIOS ────────────────────────────────────────────────
  MyApp.initMinistryModals = () => {
    const cards = $$(".card-min");
    if (!cards.length) return;

    // Remove overlay existente para evitar acúmulo de listeners
    $("#min-modal-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id        = "min-modal-overlay";
    overlay.className = "min-modal-overlay";
    overlay.innerHTML = `
      <div class="min-modal-content" role="dialog" aria-modal="true" aria-labelledby="min-modal-title">
        <div class="min-modal-header">
          <img id="min-modal-img" src="" alt="Imagem do Ministério" />
          <button class="min-modal-close" aria-label="Fechar janela"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="min-modal-body">
          <h3 id="min-modal-title">Título</h3>
          <p id="min-modal-text">Texto</p>
          <div class="text-end mt-4">
            <button class="btn btn-primary btn-cta min-modal-btn-close">Fechar Aba</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const img   = $("#min-modal-img",   overlay);
    const title = $("#min-modal-title", overlay);
    const text  = $("#min-modal-text",  overlay);
    let lastFocus = null;

    // Foco seletável dentro do modal para o focus trap
    const getFocusable = () =>
      $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', overlay)
        .filter((el) => !el.disabled);

    const trapFocus = (e) => {
      if (!overlay.classList.contains("open")) return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    const openModal = (card) => {
      lastFocus = document.activeElement;
      title.textContent = card.dataset.title || "";
      text.textContent  = card.dataset.text  || "";
      img.src           = card.dataset.img   || "";
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      // Foca o botão de fechar ao abrir
      requestAnimationFrame(() => $(".min-modal-close", overlay)?.focus());
    };

    const closeModal = () => {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      // Retorna foco ao elemento que abriu o modal
      lastFocus?.focus();
    };

    cards.forEach((card) => {
      const btn = $(".open-ministry-modal", card);
      if (btn) on(btn, "click", (e) => { e.preventDefault(); openModal(card); });
    });

    $$(".min-modal-close, .min-modal-btn-close", overlay).forEach((btn) => on(btn, "click", closeModal));
    on(overlay, "click", (e) => { if (e.target === overlay) closeModal(); });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
      trapFocus(e);
    });
  };

  // ─── VALIDADORES DE SCHEMA JSON ───────────────────────────────────────────
  const validateEvento = (ev) => {
    const required = ["titulo", "descricao", "dataExibicao", "dataISO"];
    return required.every((k) => typeof ev[k] === "string" && ev[k].trim() !== "");
  };

  const validateSermao = (s) => {
    const required = ["titulo", "pregadorData"];
    return required.every((k) => typeof s[k] === "string" && s[k].trim() !== "");
  };

  const validateTimelineItem = (item) => {
    // Campo "data" conforme schema do Decap CMS (config.yml)
    const required = ["data", "titulo", "descricao"];
    return required.every((k) => typeof item[k] === "string" && item[k].trim() !== "");
  };

  const validateLider = (l) => {
    const required = ["nome", "cargo"];
    return required.every((k) => typeof l[k] === "string" && l[k].trim() !== "");
  };

  // ─── TEMPLATES DE SKELETON LOADING ───────────────────────────────────────
  const skeletonEvento = () => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="skeleton-card h-100 d-flex flex-column">
        <div class="skeleton skeleton-img"></div>
        <div class="p-3 d-flex flex-column flex-grow-1">
          <div class="skeleton skeleton-line w-75"></div>
          <div class="skeleton skeleton-line w-50"></div>
          <div class="skeleton skeleton-line mt-2 w-100"></div>
          <div class="skeleton skeleton-line w-90 mb-3"></div>
          <div class="d-flex gap-2 mt-auto">
            <div class="skeleton skeleton-btn"></div>
            <div class="skeleton skeleton-btn"></div>
          </div>
        </div>
      </div>
    </div>`;

  const skeletonSermao = () => `
    <div class="col-12 col-md-4">
      <div class="skeleton-card h-100 d-flex flex-column p-3">
        <div class="skeleton skeleton-line w-90 mb-2" style="height:1.3rem"></div>
        <div class="skeleton skeleton-line w-60 mb-auto"></div>
        <div class="d-flex gap-2 pt-3">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>`;

  // ─── RENDERIZADORES ───────────────────────────────────────────────────────
  const renderEvento = (evento, index) => {
    if (!validateEvento(evento)) return "";
    const delay       = (index % 3) * 80;
    const titulo      = escapeHTML(evento.titulo);
    const descricao   = escapeHTML(evento.descricao);
    const dataExib    = escapeHTML(evento.dataExibicao);
    const dataISO     = escapeHTML(evento.dataISO);
    const imgUrl      = encodeURI(evento.imagem || "");
    const calendarUrl = encodeURI(evento.linkCalendario || "#");
    const whatsUrl    = encodeURI(evento.linkWhats || "#");
    // Botão de partilha: usa Web Share API nativa; fallback para WhatsApp
    const shareBtn = `<button
        class="btn btn-outline-primary btn-sm btn-share"
        data-share-title="${titulo}"
        data-share-text="${descricao}"
        data-share-url="${calendarUrl !== encodeURI("#") ? calendarUrl : window.location.href}"
        data-share-fallback="${whatsUrl}"
        aria-label="Compartilhar ${titulo}">
        <i class="fa-solid fa-share-nodes me-1" aria-hidden="true"></i>Compartilhar
      </button>`;
    return `
      <div class="col-12 col-md-6 col-lg-4 evento-item" data-animate="fade-up" data-delay="${delay}" data-tipo="${escapeHTML(evento.tipo || "")}">
        <article class="card-event h-100 d-flex flex-column">
          <img class="lazy" data-src="${imgUrl}" alt="${titulo}" />
          <div class="p-3 d-flex flex-column flex-grow-1">
            <h3 class="mb-1">${titulo}</h3>
            <p class="text-muted mb-1"><strong>Data:</strong> <time datetime="${dataISO}">${dataExib}</time></p>
            <p class="mb-3 flex-grow-1">${descricao}</p>
            <div class="d-flex gap-2 mt-auto">
              <a class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer" href="${calendarUrl}">Calendário</a>
              ${shareBtn}
            </div>
          </div>
        </article>
      </div>`;
  };

  const renderSermao = (sermao, index) => {
    if (!validateSermao(sermao)) return "";
    const delay       = (index % 3) * 120;
    const titulo      = escapeHTML(sermao.titulo);
    const pregadorData = escapeHTML(sermao.pregadorData);
    const videoUrl    = encodeURI(sermao.linkVideo || "#");
    const audioUrl    = encodeURI(sermao.linkAudio || "#");

    // Botão de áudio acessível: <button disabled> em vez de <a aria-disabled>
    const btnAudio = sermao.audioDisponivel
      ? `<a class="btn btn-outline-primary btn-sm" href="${audioUrl}" target="_blank" rel="noopener noreferrer">Ouvir áudio</a>`
      : `<button class="btn btn-outline-primary btn-sm" disabled aria-disabled="true" title="Áudio ainda não disponível">Ouvir (em breve)</button>`;

    return `
      <div class="col-12 col-md-4" data-animate="fade-up" data-delay="${delay}">
        <article class="sermon h-100 d-flex flex-column">
          <h3 class="mb-2">${titulo}</h3>
          <p class="text-muted mb-3 flex-grow-1">${pregadorData}</p>
          <div class="d-flex gap-2 mt-auto">
            <a class="btn btn-primary btn-sm" href="${videoUrl}" target="_blank" rel="noopener noreferrer">Assistir</a>
            ${btnAudio}
          </div>
        </article>
      </div>`;
  };

  const renderTimelineItem = (item) => {
    if (!validateTimelineItem(item)) return "";
    // Campo "data" conforme schema do Decap CMS (config.yml linha 82)
    return `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-date">${escapeHTML(item.data)}</span>
          <h3>${escapeHTML(item.titulo)}</h3>
          <p>${escapeHTML(item.descricao)}</p>
        </div>
      </div>`;
  };

  const renderLider = (lider, index) => {
    if (!validateLider(lider)) return "";
    const delay     = index * 100;
    const nome      = escapeHTML(lider.nome);
    const cargo     = escapeHTML(lider.cargo);
    const imgSrc    = encodeURI(lider.imagem || "");
    const instagram = encodeURI(lider.instagram || "#");
    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3" data-animate="fade-up" data-delay="${delay}">
        <div class="leader-card">
          <div class="leader-img-wrapper">
            <img data-src="${imgSrc}" alt="${nome}" class="lazy" />
            <div class="leader-social">
              <a href="${instagram}" ${instagram !== "#" ? 'target="_blank" rel="noopener noreferrer"' : ""}><i class="fab fa-instagram"></i></a>
            </div>
          </div>
          <div class="leader-info">
            <h3>${nome}</h3><span>${cargo}</span>
          </div>
        </div>
      </div>`;
  };

  // ─── SEÇÃO DINÂMICA (PARAMETRIZADA) ──────────────────────────────────────
  // Substitui initEventos e initSermoes como função genérica reutilizável.
  MyApp.initDynamicSection = async ({
    containerId,
    jsonFile,
    key,
    renderer,
    emptyMessage,
    errorMessage,
    onAfterRender,
    skeletonTemplate = null, // função () => string HTML de um card skeleton
    skeletonCount    = 3,    // quantos skeletons mostrar enquanto carrega
  }) => {
    const grid = $(containerId);
    if (!grid) return;

    // Mostra skeletons imediatamente, substituindo o spinner estático
    if (skeletonTemplate) {
      grid.innerHTML = Array.from({ length: skeletonCount }, skeletonTemplate).join("");
    }

    try {
      const dados = await MyApp.fetchJSON(jsonFile);
      const items = Array.isArray(dados[key]) ? dados[key] : [];
      if (!items.length) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">${emptyMessage}</div>`;
        return;
      }
      grid.innerHTML = items.map(renderer).join("");
      if (onAfterRender) onAfterRender(grid, items);
    } catch (err) {
      const isOffline = !navigator.onLine;
      const msg = isOffline
        ? `<i class="fa-solid fa-wifi-slash me-2"></i>Você está offline. ${errorMessage}`
        : `<i class="fa-solid fa-circle-exclamation me-2"></i>${errorMessage}`;
      grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">${msg}</div>`;
      MyApp.log("Erro ao carregar", jsonFile, err.message);
    }
  };

  MyApp.initEventos = async () => {
    const select = $("#filtro-eventos");
    await MyApp.initDynamicSection({
      containerId:      "#eventos-grid",
      jsonFile:         "eventos.json",
      key:              "eventos",
      renderer:         renderEvento,
      emptyMessage:     "Nenhum evento programado no momento. Volte em breve!",
      errorMessage:     "Não foi possível carregar a programação. Tente recarregar a página.",
      skeletonTemplate: skeletonEvento,
      skeletonCount:    3,
      onAfterRender: (grid) => {
        MyApp.registerLazyElements($$("[data-src]", grid));
        MyApp.registerRevealElements($$("[data-animate]", grid));
        if (select) {
          on(select, "change", () => {
            const filtro = select.value;
            $$(".evento-item", grid).forEach((card) => {
              card.style.display =
                filtro === "todos" || card.dataset.tipo === filtro ? "" : "none";
            });
          });
        }
      },
    });
  };

  MyApp.initSermoes = async () => {
    await MyApp.initDynamicSection({
      containerId:      "#sermoes-grid",
      jsonFile:         "sermoes.json",
      key:              "sermoes",
      renderer:         renderSermao,
      emptyMessage:     "Nenhum sermão disponível no momento. Confira nosso canal no YouTube!",
      errorMessage:     "Não foi possível carregar os sermões. Tente recarregar a página.",
      skeletonTemplate: skeletonSermao,
      skeletonCount:    3,
      onAfterRender: (grid) => {
        MyApp.registerRevealElements($$("[data-animate]", grid));
      },
    });
  };

  // ─── PÁGINA SOBRE (DINÂMICA) ──────────────────────────────────────────────
  // Estrutura do sobre.json segue o schema do Decap CMS (admin/config.yml):
  //   hero.titulo, hero.subtitulo, hero.imagem
  //   historia.titulo, historia.paragrafo1, historia.paragrafo2, historia.imagem
  //   timeline[].data, timeline[].titulo, timeline[].descricao
  //   lideranca[].nome, lideranca[].cargo, lideranca[].imagem, lideranca[].instagram
  MyApp.initSobre = async () => {
    const textoEl     = $("#sobre-texto");
    const timelineEl  = $("#timeline-container");
    const liderancaEl = $("#lideranca-grid");
    if (!textoEl && !timelineEl && !liderancaEl) return;

    try {
      const dados = await MyApp.fetchJSON("sobre.json");
      const historia = dados.historia || {};

      // Texto introdutório da história
      if (textoEl && (historia.paragrafo1 || historia.paragrafo2)) {
        const titulo = escapeHTML(historia.titulo || "Uma Igreja Família");
        textoEl.innerHTML = `
          <h2 class="section-title mb-3">${titulo}</h2>
          ${historia.paragrafo1 ? `<p>${escapeHTML(historia.paragrafo1)}</p>` : ""}
          ${historia.paragrafo2 ? `<p>${escapeHTML(historia.paragrafo2)}</p>` : ""}`;
      }

      // Linha do tempo
      if (timelineEl && Array.isArray(dados.timeline) && dados.timeline.length) {
        timelineEl.innerHTML = dados.timeline.map(renderTimelineItem).join("");
        MyApp.initTimeline();
      }

      // Liderança
      if (liderancaEl && Array.isArray(dados.lideranca) && dados.lideranca.length) {
        liderancaEl.innerHTML = dados.lideranca.map(renderLider).join("");
        MyApp.registerLazyElements($$("[data-src]", liderancaEl));
        MyApp.registerRevealElements($$("[data-animate]", liderancaEl));
      }
    } catch {
      MyApp.log("Erro ao carregar sobre.json — usando conteúdo estático.");
    }
  };

  // ─── PÁGINA INICIAL ───────────────────────────────────────────────────────
  MyApp.initPaginaInicial = async () => {
    const heroTitulo    = $("#hero-titulo");
    const heroSubtitulo = $("#hero-subtitulo");
    const heroBg        = $("#hero-bg");
    if (!heroTitulo || !heroSubtitulo || !heroBg) return;
    try {
      const dados = await MyApp.fetchJSON("inicio.json");
      if (dados.hero) {
        heroTitulo.textContent    = dados.hero.titulo;
        heroSubtitulo.textContent = dados.hero.subtitulo;
        const imgVal = dados.hero.imagem;
        if (heroBg.classList.contains("lazy")) heroBg.dataset.lazy = imgVal;
        else heroBg.style.backgroundImage = `url(${encodeURI(imgVal)})`;
      }
    } catch {
      MyApp.log("Usando textos padrão da Página Inicial.");
    }
  };

  // ─── CONTATOS ─────────────────────────────────────────────────────────────
  MyApp.initContatos = async () => {
    try {
      const dados = await MyApp.fetchJSON("contatos.json");
      if (dados.instagram) $$('a[href*="instagram.com"]').forEach((a) => (a.href = encodeURI(dados.instagram)));
      if (dados.facebook)  $$('a[href*="facebook.com"]').forEach((a) => (a.href = encodeURI(dados.facebook)));
      if (dados.youtube)   $$('a[href*="youtube.com"]').forEach((a) => (a.href = encodeURI(dados.youtube)));

      const elTelefone = $("#info-telefone");
      const elEmail    = $("#info-email");
      const elEndereco = $("#info-endereco");

      if (elTelefone && dados.telefone)
        elTelefone.innerHTML = `<i class="fa-solid fa-phone me-2 text-primary"></i>${escapeHTML(dados.telefone)}`;
      if (elEmail && dados.email)
        elEmail.innerHTML = `<i class="fa-solid fa-envelope me-2 text-primary"></i>${escapeHTML(dados.email)}`;
      if (elEndereco && dados.endereco)
        elEndereco.innerHTML = `<i class="fa-solid fa-location-dot me-2 text-primary"></i>${escapeHTML(dados.endereco)}`;
    } catch {
      MyApp.log("Usando contatos padrão.");
    }
  };

  // ─── BANNER AO VIVO ───────────────────────────────────────────────────────
  // URL e horário configurados em MyApp.config para fácil manutenção
  MyApp.initLiveBanner = () => {
    const { dayOfWeek, startHour, endHour } = MyApp.config.liveSchedule;
    const agora = new Date();
    if (agora.getDay() !== dayOfWeek) return;
    if (agora.getHours() < startHour || agora.getHours() >= endHour) return;

    const banner = document.createElement("a");
    banner.href      = MyApp.config.liveUrl;
    banner.target    = "_blank";
    banner.rel       = "noopener noreferrer";
    banner.className = "live-banner";
    banner.innerHTML = `<span class="live-dot"></span><span><strong>ESTAMOS EM DIRETO:</strong> Clique aqui para assistir ao culto de hoje!</span>`;
    document.body.insertBefore(banner, document.body.firstChild);
  };

  // ─── VERSÍCULO DA SEMANA ──────────────────────────────────────────────────
  MyApp.initVersiculoDaSemana = () => {
    const verseText = $("#verse-text");
    const verseRef  = $("#verse-ref");
    if (!verseText || !verseRef) return;

    const versiculos = [
      { texto: "O Senhor é o meu pastor; nada me faltará.",                                                                              ref: "Salmos 23:1"         },
      { texto: "Entregue o seu caminho ao Senhor; confie nele, e ele agirá.",                                                            ref: "Salmos 37:5"         },
      { texto: "Tudo posso naquele que me fortalece.",                                                                                   ref: "Filipenses 4:13"     },
      { texto: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá.",                                                ref: "João 14:27"          },
      { texto: "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar.",                 ref: "Jeremias 29:11"      },
      { texto: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.",                                   ref: "Isaías 40:31"        },
      { texto: "O Senhor é a minha luz e a minha salvação; de quem terei medo?",                                                        ref: "Salmos 27:1"         },
      { texto: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.",                                             ref: "Mateus 11:28"        },
      { texto: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",                                                     ref: "Salmos 119:105"      },
      { texto: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados... pois o Senhor os acompanhará.",                      ref: "Deuteronômio 31:6"   },
    ];

    const agora      = new Date();
    const inicioAno  = new Date(agora.getFullYear(), 0, 1);
    const diasPass   = Math.floor((agora - inicioAno) / 86400000);
    const semana     = Math.ceil((agora.getDay() + 1 + diasPass) / 7);
    const idx        = semana % versiculos.length;

    verseText.textContent = `"${versiculos[idx].texto}"`;
    verseRef.textContent  = versiculos[idx].ref;
  };

  // ─── ACESSIBILIDADE ───────────────────────────────────────────────────────
  MyApp.initAccessibility = () => {
    const btn   = $("#btnA11y");
    const panel = $("#a11yPanel");
    if (!btn || !panel) return;

    const STORAGE_KEY = "advic-a11y";
    const baseState = {
      fontScale: 1, highContrast: false, highlightLinks: false,
      letterSpacing: false, dyslexiaFont: false, largeCursor: false, reduceMotion: false,
    };

    const loadState = () => {
      try { return { ...baseState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
      catch { return { ...baseState }; }
    };

    const state = loadState();
    const saveState = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* privado */ }
    };

    const applyState = () => {
      document.body.style.fontSize = `${Math.round(state.fontScale * 100)}%`;
      document.body.classList.toggle("a11y-high-contrast",   state.highContrast);
      document.body.classList.toggle("a11y-highlight-links", state.highlightLinks);
      document.body.classList.toggle("a11y-letter-spacing",  state.letterSpacing);
      document.body.classList.toggle("a11y-dyslexia",        state.dyslexiaFont);
      document.body.classList.toggle("a11y-large-cursor",    state.largeCursor);
      document.body.classList.toggle("a11y-reduce-motion",   state.reduceMotion);

      const toggle = (id, val) => $(id)?.classList.toggle("active", val);
      toggle("#btn-a11y-contrast", state.highContrast);
      toggle("#btn-a11y-links",    state.highlightLinks);
      toggle("#btn-a11y-spacing",  state.letterSpacing);
      toggle("#btn-a11y-dyslexia", state.dyslexiaFont);
      toggle("#btn-a11y-cursor",   state.largeCursor);
    };

    applyState();

    let lastFocus = null;
    const openPanel  = () => {
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      lastFocus = document.activeElement;
      panel.querySelector("button")?.focus();
    };
    const closePanel = () => {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      if (lastFocus?.focus) lastFocus.focus();
    };

    const synth  = "speechSynthesis" in window ? window.speechSynthesis : null;
    const btnRead = $("#btn-a11y-read");

    const cancelSpeech = () => {
      if (synth?.speaking) synth.cancel();
      btnRead?.classList.remove("active");
    };

    const readPage = () => {
      if (!synth) return MyApp.showToast("Leitura não suportada.", "error");
      if (synth.speaking) { cancelSpeech(); return MyApp.showToast("Leitura interrompida.", "info"); }
      const text = ($("#conteudo") || document.body).innerText?.trim().replace(/\s+/g, " ");
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang  = "pt-BR";
      utterance.onend = () => btnRead?.classList.remove("active");
      btnRead?.classList.add("active");
      synth.speak(utterance);
      MyApp.showToast("Lendo conteúdo em voz alta...", "info");
    };

    const handleAction = (action) => {
      switch (action) {
        case "font-inc":         state.fontScale     = Math.min(state.fontScale + 0.1, 1.5);   break;
        case "font-dec":         state.fontScale     = Math.max(state.fontScale - 0.1, 0.9);   break;
        case "toggle-contrast":  state.highContrast  = !state.highContrast;                    break;
        case "toggle-links":     state.highlightLinks = !state.highlightLinks;                 break;
        case "toggle-spacing":   state.letterSpacing  = !state.letterSpacing;                  break;
        case "toggle-dyslexia":  state.dyslexiaFont   = !state.dyslexiaFont;                   break;
        case "toggle-cursor":    state.largeCursor    = !state.largeCursor;                    break;
        case "read-page":        readPage(); return;
        case "reset":            cancelSpeech(); Object.assign(state, baseState); MyApp.showToast("Configurações redefinidas.", "success"); break;
      }
      applyState();
      saveState();
    };

    on(btn,  "click", (e) => { e.preventDefault(); panel.classList.contains("open") ? closePanel() : openPanel(); });
    on($("[data-a11y-close]", panel), "click", (e) => { e.preventDefault(); closePanel(); });
    $$("[data-a11y-action]", panel).forEach((b) => on(b, "click", () => handleAction(b.dataset.a11yAction)));
    on(document, "click",   (e) => { if (panel.classList.contains("open") && !panel.contains(e.target) && !btn.contains(e.target)) closePanel(); });
    on(document, "keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) closePanel(); });
  };

  // ─── BOTÃO TOPO ───────────────────────────────────────────────────────────
  MyApp.initTop = () => {
    const btn = $("#btnTop");
    if (!btn) return;
    let ticking = false;
    on(window, "scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          btn.classList.toggle("show", window.scrollY > MyApp.config.scrollTopThreshold);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    on(btn, "click", (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  };

  // ─── PREFETCH ─────────────────────────────────────────────────────────────
  MyApp.prefetch = () => {
    $$('a[href$=".html"]').forEach((a) => {
      on(a, "mouseenter", () => {
        const l  = document.createElement("link");
        l.rel    = "prefetch";
        l.as     = "document";
        l.href   = a.getAttribute("href");
        document.head.appendChild(l);
      }, { once: true, passive: true });
    });
  };

  // ─── PWA INSTALL ──────────────────────────────────────────────────────────
  MyApp.initPWA = () => {
    let deferredPrompt;
    const container  = $("#pwa-install-container");
    const btnInstall = $("#btn-pwa-install");
    const btnClose   = $("#btn-pwa-close");

    on(window, "beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (container) container.style.display = "block";
    });

    on(btnInstall, "click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted" && container) container.style.display = "none";
      deferredPrompt = null;
    });

    on(btnClose, "click", () => { if (container) container.style.display = "none"; });
  };

  // ─── MAPA (LAZY VIA OBSERVER POOL) ───────────────────────────────────────
  MyApp.initMap = () => {
    const map = $(".mapa-wrapper iframe[data-src]");
    if (!map || !("IntersectionObserver" in window)) return;
    // Reutiliza o observer de lazy loading singleton
    getLazyObserver().observe(map);
  };

  // ─── DARK MODE ────────────────────────────────────────────────────────────
  MyApp.initDarkMode = () => {
    const btn = $("#btnDarkMode");
    if (!btn) return;

    const applyTheme = (theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem("advic-theme", theme); } catch { /* privado */ }
      btn.innerHTML =
        theme === "dark"
          ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro",
      );
    };

    on(btn, "click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });

    // Sincroniza com mudanças do sistema operacional enquanto a aba está aberta
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("advic-theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
  };

  // ─── CONTADOR REGRESSIVO ──────────────────────────────────────────────────
  MyApp.initCountdown = async () => {
    const container = $("#countdown-container");
    if (!container) return;

    try {
      const dados = await MyApp.fetchJSON("eventos.json");
      const agora  = new Date();
      const proximos = (Array.isArray(dados.eventos) ? dados.eventos : [])
        .filter((ev) => ev.dataISO && new Date(ev.dataISO) > agora)
        .sort((a, b) => new Date(a.dataISO) - new Date(b.dataISO));

      if (!proximos.length) {
        container.closest("section")?.style.setProperty("display", "none");
        return;
      }

      const evento = proximos[0];
      const alvo   = new Date(evento.dataISO);

      container.innerHTML = `
        <p class="countdown-label">PRÓXIMO EVENTO</p>
        <p class="countdown-titulo">${escapeHTML(evento.titulo)}</p>
        <div class="countdown-timer" id="countdown-timer" role="timer" aria-live="off" aria-label="Contagem regressiva">
          <div class="countdown-unit"><span id="cd-days">--</span><small>dias</small></div>
          <span class="countdown-sep" aria-hidden="true">:</span>
          <div class="countdown-unit"><span id="cd-hours">--</span><small>horas</small></div>
          <span class="countdown-sep" aria-hidden="true">:</span>
          <div class="countdown-unit"><span id="cd-mins">--</span><small>min</small></div>
          <span class="countdown-sep" aria-hidden="true">:</span>
          <div class="countdown-unit"><span id="cd-secs">--</span><small>seg</small></div>
        </div>`;

      const pad  = (n) => String(n).padStart(2, "0");

      const tick = () => {
        const diff = alvo - new Date();
        if (diff <= 0) {
          clearInterval(timerId);
          container.innerHTML = `<p class="lead fw-bold text-primary">O evento está a acontecer agora! 🎉</p>`;
          return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000)  / 60000);
        const s = Math.floor((diff % 60000)    / 1000);
        $("#cd-days").textContent  = pad(d);
        $("#cd-hours").textContent = pad(h);
        $("#cd-mins").textContent  = pad(m);
        $("#cd-secs").textContent  = pad(s);
      };

      tick();
      if (MyApp._countdownTimerId) clearInterval(MyApp._countdownTimerId);
      MyApp._countdownTimerId = setInterval(tick, 1000);
    } catch {
      container.closest("section")?.style.setProperty("display", "none");
    }
  };

  // ─── NOTIFICAÇÃO DE ATUALIZAÇÃO DO SERVICE WORKER ────────────────────────
  MyApp.initPWAUpdate = (registration) => {
    if (!registration) return;

    const showBanner = () => {
      if ($("#sw-update-banner")) return; // já visível
      const banner = document.createElement("div");
      banner.id = "sw-update-banner";
      banner.className = "sw-update-banner";
      banner.setAttribute("role", "alert");
      banner.innerHTML = `
        <span><i class="fa-solid fa-rotate me-2" aria-hidden="true"></i>Nova versão disponível!</span>
        <div class="sw-update-actions">
          <button id="btn-sw-update" class="btn btn-sm btn-light">Atualizar agora</button>
          <button id="btn-sw-dismiss" class="sw-update-dismiss" aria-label="Fechar">×</button>
        </div>`;
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add("show"));

      on($("#btn-sw-update"), "click", () => {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
      on($("#btn-sw-dismiss"), "click", () => {
        banner.classList.remove("show");
        setTimeout(() => banner.remove(), 350);
      });
    };

    // SW novo já está em espera (ex: aba recarregada)
    if (registration.waiting && navigator.serviceWorker.controller) showBanner();

    // SW novo encontrado após o carregamento da página
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showBanner();
        }
      });
    });

    // Quando o novo SW assume o controlo, recarrega a página
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  };

  // ─── WEB SHARE API ────────────────────────────────────────────────────────
  // Delegação de evento no document — funciona para cards injetados dinamicamente
  MyApp.initWebShare = () => {
    on(document, "click", async (e) => {
      const btn = e.target.closest(".btn-share");
      if (!btn) return;

      const title    = btn.dataset.shareTitle    || document.title;
      const text     = btn.dataset.shareText     || "";
      const url      = btn.dataset.shareUrl      || window.location.href;
      const fallback = btn.dataset.shareFallback || "";

      if ("share" in navigator) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (err) {
          if (err.name === "AbortError") return; // utilizador cancelou
        }
      }

      // Fallback: WhatsApp ou link direto
      const waUrl = fallback && fallback !== encodeURI("#")
        ? fallback
        : `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    });
  };

  // ─── BOOTSTRAP ───────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    MyApp.initPreloader();
    MyApp.Security.enforceHTTPS();
    MyApp.Security.hardenLinks();
    MyApp.Security.frameBusting();
    MyApp.Security.lockConsole();
    MyApp.Security.warnInlineHandlers();

    MyApp.initMenu();
    MyApp.initSmoothScroll();
    MyApp.initLazy();
    MyApp.initScrollSpy();
    MyApp.initReveal();
    MyApp.initTimeline();
    MyApp.initContactForm();
    MyApp.initMinistryModals();
    MyApp.initMap();

    MyApp.initPaginaInicial();
    MyApp.initContatos();
    MyApp.initEventos();
    MyApp.initSermoes();
    MyApp.initSobre();

    MyApp.initDarkMode();
    MyApp.initWebShare();
    MyApp.initCountdown();
    MyApp.initLiveBanner();
    MyApp.initVersiculoDaSemana();
    MyApp.initTop();
    MyApp.initAccessibility();
    MyApp.initPWA();
    MyApp.prefetch();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .then((registration) => {
          MyApp.log("Service Worker ativo.");
          MyApp.initPWAUpdate(registration);
        })
        .catch((err) => MyApp.log("Erro no SW:", err));
    }
  });
})();
