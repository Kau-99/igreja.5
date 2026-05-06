"use strict";

(() => {
  const saved   = localStorage.getItem("advic-theme");
  const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute(
    "data-theme",
    saved || (prefers ? "dark" : "light"),
  );
})();

(() => {
  const A11Y_PANEL = `
<button id="btnA11y" class="accessibility-fab" aria-label="Abrir opções de acessibilidade" aria-haspopup="true" aria-controls="a11yPanel" aria-expanded="false">
  <i class="fa-solid fa-universal-access" aria-hidden="true"></i>
</button>
<section id="a11yPanel" class="accessibility-panel" aria-label="Ferramentas de acessibilidade" aria-hidden="true" role="dialog">
  <header class="a11y-panel-header">
    <span><i class="fa-solid fa-universal-access me-2 text-primary"></i> Acessibilidade</span>
    <button type="button" class="a11y-close" data-a11y-close aria-label="Fechar painel">&times;</button>
  </header>
  <div class="a11y-panel-body">
    <div class="a11y-grid">
      <button type="button" class="a11y-tool" data-a11y-action="font-inc" title="Aumentar texto">
        <i class="fa-solid fa-magnifying-glass-plus"></i>Texto +
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="font-dec" title="Diminuir texto">
        <i class="fa-solid fa-magnifying-glass-minus"></i>Texto -
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="toggle-contrast" id="btn-a11y-contrast">
        <i class="fa-solid fa-circle-half-stroke"></i>Contraste
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="toggle-links" id="btn-a11y-links">
        <i class="fa-solid fa-link"></i>Destacar Links
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="toggle-spacing" id="btn-a11y-spacing">
        <i class="fa-solid fa-text-width"></i>Espaçamento
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="toggle-dyslexia" id="btn-a11y-dyslexia">
        <i class="fa-solid fa-font"></i>Dislexia
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="toggle-cursor" id="btn-a11y-cursor">
        <i class="fa-solid fa-arrow-pointer"></i>Cursor Maior
      </button>
      <button type="button" class="a11y-tool" data-a11y-action="read-page" id="btn-a11y-read">
        <i class="fa-solid fa-volume-high"></i>Ler Página
      </button>
    </div>
    <button type="button" class="a11y-reset-btn" data-a11y-action="reset">
      <i class="fa-solid fa-rotate-right me-2"></i>Redefinir Configurações
    </button>
  </div>
</section>
<button id="btnTop" class="btn-top" aria-label="Voltar ao topo">
  <i class="fa-solid fa-arrow-up"></i>
</button>`;

  const navMenu = document.querySelector(".nav-menu");
  if (navMenu && !document.getElementById("btnDarkMode")) {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const darkBtn = document.createElement("button");
    darkBtn.id        = "btnDarkMode";
    darkBtn.className = "btn-dark-mode";
    darkBtn.setAttribute("aria-label", "Alternar modo escuro");
    darkBtn.setAttribute("title",      "Alternar modo escuro / claro");
    darkBtn.innerHTML = currentTheme === "dark"
      ? '<i class="fa-solid fa-sun"  aria-hidden="true"></i>'
      : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';

    const li = document.createElement("li");
    li.className = "nav-dark-mode-li";
    li.appendChild(darkBtn);

    const lastLi = navMenu.querySelector("li:last-child");
    lastLi ? navMenu.insertBefore(li, lastLi) : navMenu.appendChild(li);
  }

  if (!document.getElementById("btnA11y")) {
    document.body.insertAdjacentHTML("beforeend", A11Y_PANEL);
  }

  // ── Plausible Analytics (sem cookies, conformidade LGPD) ─────────────────
  // ⚠️  CONFIGURAÇÃO: Crie uma conta gratuita em https://plausible.io
  //     e adicione o domínio "igrejaadvic.netlify.app" no painel deles.
  //     A partir daí, este script começa a registar visitas automaticamente.
  if (!document.getElementById("plausible-script")) {
    const pl = document.createElement("script");
    pl.id    = "plausible-script";
    pl.defer = true;
    pl.setAttribute("data-domain", "igrejaadvic.netlify.app");
    pl.src = "https://plausible.io/js/script.js";
    document.head.appendChild(pl);
  }

  // ── OneSignal Web Push Notifications ─────────────────────────────────────
  // ⚠️  CONFIGURAÇÃO NECESSÁRIA (3 passos):
  //     1. Crie uma conta gratuita em https://onesignal.com
  //     2. Crie um novo App → plataforma "Web"
  //     3. Copie o App ID e substitua "SEU_APP_ID_AQUI" abaixo
  const ONESIGNAL_APP_ID = "SEU_APP_ID_AQUI";
  if (ONESIGNAL_APP_ID === "SEU_APP_ID_AQUI") {
    console.info("[ADVIC] Push notifications desativadas — configure ONESIGNAL_APP_ID em components.js");
  } else if (!document.getElementById("onesignal-script")) {
    const os  = document.createElement("script");
    os.id     = "onesignal-script";
    os.src    = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    os.defer  = true;
    document.head.appendChild(os);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      OneSignal.init({
        appId:                   ONESIGNAL_APP_ID,
        serviceWorkerPath:       "sw.js",
        notifyButton:            { enable: false },
        welcomeNotification:     { disable: true },
        promptOptions: {
          slidedown: {
            prompts: [{
              type: "push",
              autoPrompt: false,
              text: {
                actionMessage:  "Receba avisos de eventos e novidades da ADVIC.",
                acceptButton:   "Permitir",
                cancelButton:   "Agora não",
              },
            }],
          },
        },
      });
    });
  }

  const rawFile   = window.location.pathname.split("/").pop();
  const currentFile = rawFile === "" || rawFile === "index.html" ? "index.html" : rawFile;
  document.querySelectorAll(".nav-menu a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive = href === currentFile ||
      (currentFile === "index.html" && (href === "" || href === "/"));
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
})();
