"use strict";
(() => {
  const MyApp = (window.MyApp = window.MyApp || {});

  MyApp.config = {
    ENV: (window.ENVIRONMENT || "production").toLowerCase(),
    scrollTopThreshold: 260,
    toastDuration: 4000,
    lazySelector:
      "img[data-src], .lazy[data-src], [data-lazy], iframe[data-src]",
  };

  MyApp.log = (...a) =>
    MyApp.config.ENV === "development" ? console.log("[ADVIC]", ...a) : 0;

  // Utilitários de Seleção de DOM
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  // NOVO: Sanitização de Segurança (Impede injeção de código malicioso via JSON)
  const escapeHTML = (str) => {
    if (typeof str !== "string") return str;
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag],
    );
  };

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
        )
          return;
        try {
          const url = new URL(raw, window.location.origin);
          if (url.origin !== window.location.origin) {
            a.setAttribute("target", "_blank");
            const rel = (a.getAttribute("rel") || "").split(/\s+/);
            if (!rel.includes("noopener")) rel.push("noopener");
            if (!rel.includes("noreferrer")) rel.push("noreferrer");
            a.setAttribute("rel", rel.join(" ").trim());
          }
        } catch {
          return;
        }
      });
    },
    frameBusting() {
      try {
        if (
          window.top !== window.self &&
          !document.body.classList.contains("allow-embed")
        ) {
          window.top.location = window.location;
        }
      } catch {}
    },
    enforceHTTPS() {
      if (
        window.location.protocol === "http:" &&
        !/^localhost$/i.test(window.location.hostname) &&
        !/^127\.0\.0\.1$/i.test(window.location.hostname)
      ) {
        window.location.replace(
          `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      }
    },
    lockConsole() {
      if (MyApp.config.ENV !== "production") return;
      ["log", "debug", "info", "trace"].forEach((m) => {
        try {
          console[m] = () => {};
        } catch {}
      });
    },
    warnInlineHandlers() {
      if (MyApp.config.ENV !== "development") return;
      const hasInline = $$("*").filter((el) =>
        Array.from(el.attributes).some((attr) => /^on/i.test(attr.name)),
      );
      if (hasInline.length)
        MyApp.log("Elementos com handlers inline encontrados.", hasInline);
    },
  };

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
      setTimeout(
        () => {
          preloader.classList.add("preloader--hidden");
          document.body.classList.remove("preloader-active");
          setTimeout(() => preloader?.parentNode?.removeChild(preloader), 600);
        },
        Math.max(0, 600 - elapsed),
      );
    };

    window.addEventListener("load", hidePreloader);
    setTimeout(hidePreloader, 8000); // Fallback de segurança de 8s
  };

  MyApp.initMenu = () => {
    const toggle = $(".nav-toggle");
    const nav = $(".nav-wrapper");
    const links = $$(".nav-menu a");

    if (!toggle || !nav) return;

    const toggleMenu = (forceState) => {
      const isOpen =
        typeof forceState === "boolean"
          ? forceState
          : !toggle.classList.contains("open");
      toggle.classList.toggle("open", isOpen);
      nav.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    };

    on(toggle, "click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    links.forEach((link) => on(link, "click", () => toggleMenu(false)));

    on(document, "keydown", (e) => {
      if (e.key === "Escape" && toggle.classList.contains("open")) {
        toggleMenu(false);
        toggle.focus();
      }
    });

    on(document, "click", (e) => {
      if (
        toggle.classList.contains("open") &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        toggleMenu(false);
      }
    });
  };

  MyApp.initSmoothScroll = () => {
    $$('a[href^="#"]:not(.open-ministry-modal):not(.accordion-button)').forEach(
      (link) => {
        on(link, "click", (e) => {
          const target = $(link.getAttribute("href"));
          if (!target) return;
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        });
      },
    );
  };

  const queue = [];
  let activeToast = false;
  MyApp.showToast = (message = "", type = "info") => {
    queue.push({ message: String(message), type });
    if (!activeToast) processQueue();
  };

  function processQueue() {
    if (!queue.length) return (activeToast = false);
    activeToast = true;
    const { message, type } = queue.shift();
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message; // Seguro contra XSS
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener(
        "transitionend",
        () => {
          toast.remove();
          setTimeout(processQueue, 180);
        },
        { once: true },
      );
    }, MyApp.config.toastDuration);
  }

  MyApp.initLazy = () => {
    const items = $$(MyApp.config.lazySelector);
    if (!items.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries, obs) => {
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
      },
      { threshold: 0.12 },
    );
    items.forEach((i) => io.observe(i));
  };

  MyApp.initScrollSpy = () => {
    const sections = $$("section[id]");
    const links = $$('.nav-menu a[href^="#"]');
    if (
      !sections.length ||
      !links.length ||
      !("IntersectionObserver" in window)
    )
      return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            $(`.nav-menu a[href="#${en.target.id}"]`)?.classList.add("active");
          }
        });
      },
      { threshold: 0.6 },
    );
    sections.forEach((s) => io.observe(s));
  };

  MyApp.initReveal = () => {
    const els = $$("[data-animate]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          setTimeout(
            () => en.target.classList.add("in"),
            parseInt(en.target.dataset.delay || "0", 10),
          );
          obs.unobserve(en.target);
        });
      },
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
  };

  MyApp.initTimeline = () => {
    const items = $$(".timeline .timeline-item");
    if (!items.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add("show");
        });
      },
      { threshold: 0.4 },
    );
    items.forEach((i) => io.observe(i));
  };

  MyApp.initContactForm = () => {
    const form = $(".contact-form");
    if (!form) return;

    ["input", "blur"].forEach((ev) => {
      on(
        form,
        ev,
        (e) => {
          const t = e.target;
          if (t.matches("input, textarea"))
            t.classList.toggle(
              "input-error",
              !t.checkValidity() || !t.value.trim(),
            );
        },
        true,
      );
    });

    on(form, "submit", async (e) => {
      e.preventDefault();
      const honeypot = $(".honeypot", form);
      if (honeypot?.value.trim()) return; // Anti-spam

      const inputs = [$("#nome"), $("#email"), $("#assunto"), $("#mensagem")];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      let isValid = true;
      inputs.forEach((el) => {
        if (!el) return;
        const val = el.value.trim();
        const isEmailField = el.id === "email";
        const ok = isEmailField ? emailRegex.test(val) : !!val;
        el.classList.toggle("input-error", !ok);
        if (!ok) isValid = false;
      });

      if (!isValid)
        return MyApp.showToast(
          "Preencha todos os campos corretamente.",
          "error",
        );

      const actionUrl = form.getAttribute("action");
      if (!actionUrl)
        return MyApp.showToast("Erro de configuração do formulário.", "error");

      const btn = $('button[type="submit"]', form);
      const originalText = btn.innerHTML;
      btn.innerHTML = "Enviando...";
      btn.disabled = true;

      try {
        const res = await fetch(actionUrl, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          MyApp.showToast("Mensagem enviada com sucesso!", "success");
          form.reset();
        } else {
          throw new Error("Falha na resposta da rede");
        }
      } catch {
        MyApp.showToast(
          "Erro de conexão. Tente novamente mais tarde.",
          "error",
        );
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  };

  MyApp.initMinistryModals = () => {
    const cards = $$(".card-min");
    if (!cards.length) return;

    const overlay = document.createElement("div");
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
      </div>
    `;
    document.body.appendChild(overlay);

    const img = $("#min-modal-img", overlay);
    const title = $("#min-modal-title", overlay);
    const text = $("#min-modal-text", overlay);

    const closeModal = () => {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    };

    cards.forEach((card) => {
      const btn = $(".open-ministry-modal", card);
      if (btn) {
        on(btn, "click", (e) => {
          e.preventDefault();
          title.textContent = card.dataset.title || "";
          text.textContent = card.dataset.text || "";
          img.src = card.dataset.img || "";
          overlay.classList.add("open");
          document.body.style.overflow = "hidden";
        });
      }
    });

    $$(".min-modal-close, .min-modal-btn-close", overlay).forEach((btn) =>
      on(btn, "click", closeModal),
    );
    on(overlay, "click", (e) => {
      if (e.target === overlay) closeModal();
    });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open"))
        closeModal();
    });
  };

  MyApp.initEventos = async () => {
    const grid = $("#eventos-grid");
    const select = $("#filtro-eventos");
    if (!grid) return;

    try {
      const resposta = await fetch("eventos.json");
      if (!resposta.ok) throw new Error("Falha HTTP");
      const dados = await resposta.json();
      const eventos = dados.eventos || [];

      grid.innerHTML = "";
      if (!eventos.length) {
        grid.innerHTML =
          '<div class="col-12 text-center py-5 text-muted">Nenhum evento programado.</div>';
        return;
      }

      eventos.forEach((evento, index) => {
        const delay = (index % 3) * 80;
        // Validação e Escape de Dados
        const titulo = escapeHTML(evento.titulo);
        const descricao = escapeHTML(evento.descricao);
        const dataExibicao = escapeHTML(evento.dataExibicao);
        const dataISO = escapeHTML(evento.dataISO);
        const imgUrl = encodeURI(evento.imagem || "");
        const calendarUrl = encodeURI(evento.linkCalendario || "#");
        const whatsUrl = encodeURI(evento.linkWhats || "#");

        const htmlEvento = `
          <div class="col-12 col-md-6 col-lg-4 evento-item" data-animate="fade-up" data-delay="${delay}" data-tipo="${escapeHTML(evento.tipo)}">
            <article class="card-event h-100 d-flex flex-column">
              <img class="lazy" data-src="${imgUrl}" alt="${titulo}" />
              <div class="p-3 d-flex flex-column flex-grow-1">
                <h3 class="mb-1">${titulo}</h3>
                <p class="text-muted mb-1"><strong>Data:</strong> <time datetime="${dataISO}">${dataExibicao}</time></p>
                <p class="mb-3 flex-grow-1">${descricao}</p>
                <div class="d-flex gap-2 mt-auto">
                  <a class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer" href="${calendarUrl}">Calendário</a>
                  <a class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener noreferrer" href="${whatsUrl}">Compartilhar</a>
                </div>
              </div>
            </article>
          </div>
        `;
        grid.insertAdjacentHTML("beforeend", htmlEvento);
      });
      MyApp.initLazy();
      MyApp.initReveal();

      if (select) {
        on(select, "change", () => {
          const filtro = select.value;
          $$(".evento-item", grid).forEach((card) => {
            card.style.display =
              filtro === "todos" || card.dataset.tipo === filtro ? "" : "none";
          });
        });
      }
    } catch {
      grid.innerHTML =
        '<div class="col-12 text-center py-5 text-danger">Não foi possível carregar a programação.</div>';
    }
  };

  MyApp.initSermoes = async () => {
    const grid = $("#sermoes-grid");
    if (!grid) return;

    try {
      const resposta = await fetch("sermoes.json");
      if (!resposta.ok) throw new Error("Falha HTTP");
      const dados = await resposta.json();
      const sermoes = dados.sermoes || [];

      grid.innerHTML = "";
      if (!sermoes.length) {
        grid.innerHTML =
          '<div class="col-12 text-center py-4 text-muted">Nenhum sermão recente disponível.</div>';
        return;
      }

      sermoes.forEach((sermao, index) => {
        const delay = (index % 3) * 120;
        const titulo = escapeHTML(sermao.titulo);
        const pregadorData = escapeHTML(sermao.pregadorData);
        const videoUrl = encodeURI(sermao.linkVideo || "#");
        const audioUrl = encodeURI(sermao.linkAudio || "#");

        const btnAudio = sermao.audioDisponivel
          ? `<a class="btn btn-outline-primary btn-sm" href="${audioUrl}" target="_blank" rel="noopener noreferrer">Ouvir áudio</a>`
          : `<a class="btn btn-outline-primary btn-sm" href="#" aria-disabled="true" style="pointer-events:none;">Ouvir (em breve)</a>`;

        const htmlSermao = `
          <div class="col-12 col-md-4" data-animate="fade-up" data-delay="${delay}">
            <article class="sermon h-100 d-flex flex-column">
              <h3 class="mb-2">${titulo}</h3>
              <p class="text-muted mb-3 flex-grow-1">${pregadorData}</p>
              <div class="d-flex gap-2 mt-auto">
                <a class="btn btn-primary btn-sm" href="${videoUrl}" target="_blank" rel="noopener noreferrer">Assistir</a>
                ${btnAudio}
              </div>
            </article>
          </div>
        `;
        grid.insertAdjacentHTML("beforeend", htmlSermao);
      });
      MyApp.initReveal();
    } catch {
      grid.innerHTML =
        '<div class="col-12 text-center py-4 text-danger">Não foi possível carregar os sermões.</div>';
    }
  };

  MyApp.initPaginaInicial = async () => {
    const heroTitulo = $("#hero-titulo");
    const heroSubtitulo = $("#hero-subtitulo");
    const heroBg = $("#hero-bg");

    if (!heroTitulo || !heroSubtitulo || !heroBg) return;

    try {
      const resposta = await fetch("inicio.json");
      if (!resposta.ok) throw new Error("HTTP error");
      const dados = await resposta.json();

      if (dados.hero) {
        heroTitulo.textContent = dados.hero.titulo;
        heroSubtitulo.textContent = dados.hero.subtitulo;

        const imgVal = dados.hero.imagem;
        if (heroBg.classList.contains("lazy")) heroBg.dataset.lazy = imgVal;
        else heroBg.style.backgroundImage = `url(${encodeURI(imgVal)})`;
      }
    } catch {
      MyApp.log("Usando textos padrão da Página Inicial.");
    }
  };

  MyApp.initContatos = async () => {
    try {
      const resposta = await fetch("contatos.json");
      if (!resposta.ok) throw new Error("HTTP error");
      const dados = await resposta.json();

      if (dados.instagram)
        $$('a[href*="instagram.com"]').forEach(
          (a) => (a.href = encodeURI(dados.instagram)),
        );
      if (dados.facebook)
        $$('a[href*="facebook.com"]').forEach(
          (a) => (a.href = encodeURI(dados.facebook)),
        );
      if (dados.youtube)
        $$('a[href*="youtube.com"]').forEach(
          (a) => (a.href = encodeURI(dados.youtube)),
        );

      const elTelefone = $("#info-telefone");
      const elEmail = $("#info-email");
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

  MyApp.initLiveBanner = () => {
    const agora = new Date();
    const diaDaSemana = agora.getDay();
    const horaAtual = agora.getHours();

    // Mostra banner domingo (0) entre 18h e 19:59h
    if (diaDaSemana === 0 && horaAtual >= 18 && horaAtual < 20) {
      const banner = document.createElement("a");
      banner.href = "https://www.youtube.com/@advicof";
      banner.target = "_blank";
      banner.rel = "noopener noreferrer";
      banner.className = "live-banner";
      banner.innerHTML = `<span class="live-dot"></span><span><strong>ESTAMOS EM DIRETO:</strong> Clique aqui para assistir ao culto de hoje!</span>`;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  };

  MyApp.initVersiculoDaSemana = () => {
    const verseText = $("#verse-text");
    const verseRef = $("#verse-ref");
    if (!verseText || !verseRef) return;

    const versiculos = [
      {
        texto: "O Senhor é o meu pastor; nada me faltará.",
        ref: "Salmos 23:1",
      },
      {
        texto: "Entregue o seu caminho ao Senhor; confie nele, e ele agirá.",
        ref: "Salmos 37:5",
      },
      { texto: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
      {
        texto:
          "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá.",
        ref: "João 14:27",
      },
      {
        texto:
          "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar.",
        ref: "Jeremias 29:11",
      },
      {
        texto:
          "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.",
        ref: "Isaías 40:31",
      },
      {
        texto: "O Senhor é a minha luz e a minha salvação; de quem terei medo?",
        ref: "Salmos 27:1",
      },
      {
        texto:
          "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.",
        ref: "Mateus 11:28",
      },
      {
        texto:
          "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
        ref: "Salmos 119:105",
      },
      {
        texto:
          "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados... pois o Senhor os acompanhará.",
        ref: "Deuteronômio 31:6",
      },
    ];

    const agora = new Date();
    const inicioAno = new Date(agora.getFullYear(), 0, 1);
    const diasPassados = Math.floor(
      (agora - inicioAno) / (24 * 60 * 60 * 1000),
    );
    const semanaDoAno = Math.ceil((agora.getDay() + 1 + diasPassados) / 7);
    const indexSorteado = semanaDoAno % versiculos.length;

    verseText.textContent = `"${versiculos[indexSorteado].texto}"`;
    verseRef.textContent = versiculos[indexSorteado].ref;
  };

  MyApp.initAccessibility = () => {
    const btn = $("#btnA11y");
    const panel = $("#a11yPanel");
    if (!btn || !panel) return;

    const STORAGE_KEY = "advic-a11y";
    const baseState = {
      fontScale: 1,
      highContrast: false,
      highlightLinks: false,
      letterSpacing: false,
      dyslexiaFont: false,
      largeCursor: false,
      reduceMotion: false,
    };

    const loadState = () => {
      try {
        return {
          ...baseState,
          ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
        };
      } catch {
        return { ...baseState };
      }
    };

    const state = loadState();
    const saveState = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    };

    const applyState = () => {
      document.body.style.fontSize = `${Math.round(state.fontScale * 100)}%`;
      document.body.classList.toggle("a11y-high-contrast", state.highContrast);
      document.body.classList.toggle(
        "a11y-highlight-links",
        state.highlightLinks,
      );
      document.body.classList.toggle(
        "a11y-letter-spacing",
        state.letterSpacing,
      );
      document.body.classList.toggle("a11y-dyslexia", state.dyslexiaFont);
      document.body.classList.toggle("a11y-large-cursor", state.largeCursor);
      document.body.classList.toggle("a11y-reduce-motion", state.reduceMotion);

      const toggleClass = (id, condition) => {
        const el = $(id);
        if (el) el.classList.toggle("active", condition);
      };

      toggleClass("#btn-a11y-contrast", state.highContrast);
      toggleClass("#btn-a11y-links", state.highlightLinks);
      toggleClass("#btn-a11y-spacing", state.letterSpacing);
      toggleClass("#btn-a11y-dyslexia", state.dyslexiaFont);
      toggleClass("#btn-a11y-cursor", state.largeCursor);
    };

    applyState();

    let lastFocus = null;
    const openPanel = () => {
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

    const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
    let utterance = null;
    const btnRead = $("#btn-a11y-read");

    const cancelSpeech = () => {
      if (synth?.speaking) synth.cancel();
      btnRead?.classList.remove("active");
    };

    const readPage = () => {
      if (!synth) return MyApp.showToast("Leitura não suportada.", "error");
      if (synth.speaking) {
        cancelSpeech();
        return MyApp.showToast("Leitura interrompida.", "info");
      }
      const text = ($("#conteudo") || document.body).innerText
        ?.trim()
        .replace(/\s+/g, " ");
      if (!text) return;

      utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.onend = () => btnRead?.classList.remove("active");

      btnRead?.classList.add("active");
      synth.speak(utterance);
      MyApp.showToast("Lendo conteúdo em voz alta...", "info");
    };

    const handleAction = (action) => {
      switch (action) {
        case "font-inc":
          state.fontScale = Math.min(state.fontScale + 0.1, 1.5);
          break;
        case "font-dec":
          state.fontScale = Math.max(state.fontScale - 0.1, 0.9);
          break;
        case "toggle-contrast":
          state.highContrast = !state.highContrast;
          break;
        case "toggle-links":
          state.highlightLinks = !state.highlightLinks;
          break;
        case "toggle-spacing":
          state.letterSpacing = !state.letterSpacing;
          break;
        case "toggle-dyslexia":
          state.dyslexiaFont = !state.dyslexiaFont;
          break;
        case "toggle-cursor":
          state.largeCursor = !state.largeCursor;
          break;
        case "read-page":
          readPage();
          return;
        case "reset":
          cancelSpeech();
          Object.assign(state, baseState);
          MyApp.showToast("Configurações redefinidas.", "success");
          break;
      }
      applyState();
      saveState();
    };

    on(btn, "click", (e) => {
      e.preventDefault();
      panel.classList.contains("open") ? closePanel() : openPanel();
    });
    on($("[data-a11y-close]", panel), "click", (e) => {
      e.preventDefault();
      closePanel();
    });
    $$("[data-a11y-action]", panel).forEach((b) =>
      on(b, "click", () => handleAction(b.dataset.a11yAction)),
    );

    on(document, "click", (e) => {
      if (
        panel.classList.contains("open") &&
        !panel.contains(e.target) &&
        !btn.contains(e.target)
      )
        closePanel();
    });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
    });
  };

  MyApp.initTop = () => {
    const btn = $("#btnTop");
    if (!btn) return;

    // NOVO: Throttling na rolagem (Deixa a animação mais fluida e não pesa o celular)
    let isScrolling = false;
    on(
      window,
      "scroll",
      () => {
        if (!isScrolling) {
          window.requestAnimationFrame(() => {
            btn.classList.toggle(
              "show",
              window.scrollY > MyApp.config.scrollTopThreshold,
            );
            isScrolling = false;
          });
          isScrolling = true;
        }
      },
      { passive: true },
    );

    on(btn, "click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  MyApp.prefetch = () => {
    $$('a[href$=".html"]').forEach((a) => {
      a.addEventListener(
        "mouseenter",
        () => {
          const l = document.createElement("link");
          l.rel = "prefetch";
          l.as = "document";
          l.href = a.getAttribute("href");
          document.head.appendChild(l);
        },
        { once: true, passive: true },
      );
    });
  };

  /* Dispara tudo quando a página terminar de carregar */
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

    // Carregamento de dados (Isso agora roda em paralelo, mais rápido)
    MyApp.initPaginaInicial();
    MyApp.initContatos();
    MyApp.initEventos();
    MyApp.initSermoes();

    MyApp.initLiveBanner();
    MyApp.initVersiculoDaSemana();
    MyApp.initTop();
    MyApp.initAccessibility();
    MyApp.prefetch();

    const map = document.querySelector(".mapa-wrapper iframe[data-src]");
    if (map && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          map.src = map.dataset.src;
          map.removeAttribute("data-src");
          obs.unobserve(map);
        });
      });
      io.observe(map);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .then(() => MyApp.log("Service Worker ativo."))
        .catch((err) => MyApp.log("Erro no SW:", err));
    }
  });
})();
