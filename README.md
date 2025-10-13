# ADVIC — Site Institucional (HTML5 + CSS3 + JS + Bootstrap 5)

Reconstrução do site institucional da **ADVIC — Assembleia de Deus de Vila de Cava**, com foco em design clean, elegante e moderno, alta performance, segurança e acessibilidade.  
O projeto inclui as 4 páginas principais, assets, favicons e um `script.js` modular com recursos avançados de UX e otimização.

---

## 📦 Conteúdo do Repositório

/
├─ index.html
├─ sobre.html
├─ eventos.html
├─ contato.html
├─ style.css
├─ script.js
├─ logo-advic-512.png
├─ favicon.ico
├─ favicon-16x16.png
├─ favicon-32x32.png
├─ favicon-48x48.png
├─ apple-touch-icon.png
├─ android-chrome-192x192.png
├─ android-chrome-512x512.png
└─ site.webmanifest

markdown
Copiar código

> **Importante:** todos os ícones e o `site.webmanifest` ficam **na raiz do projeto**.

---

## 🖌️ Design & UI/UX

- **Minimalista e elegante**: muito espaço em branco, hierarquia visual clara, tipografia refinada.
- **Tipografia**: **Lora** (títulos) + **Inter** (corpo), via Google Fonts.
- **Paleta**: ciano/teal como primário (inspirado na arte de referência), fundos suaves e textos em chumbo.
- **Microinterações**: hovers sutis, transições suaves, animações on-scroll discretas.
- **Responsividade**: **mobile-first** usando o grid do **Bootstrap 5** + customizações CSS para não parecer “template genérico”.

---

## 🔗 Redes Sociais

- Instagram: `https://www.instagram.com/advic_viladecava/`  
- Facebook : `https://www.facebook.com/advcviladecava`  
- YouTube  : `https://youtube.com/@advicviladecava` *(ajuste o handle se for outro)*

---

## 🧠 Visão Técnica do `script.js` (Arquitetura & Engenharia)

O front-end roda encapsulado no namespace global `MyApp` (IIFE), evitando poluir o escopo.

**Objetivos principais**
- **Segurança**: hardening contra XSS/tabnabbing/clickjacking; sanitização de `href`.
- **Performance**: lazy loading de imagens/iframes/backgrounds; prefetch on hover; eventos passivos; `requestIdleCallback` (polyfill).
- **Acessibilidade (A11y)**: navegação por teclado, `aria-*`, respeito a `prefers-reduced-motion`.
- **Resiliência**: fallbacks para APIs modernas; detecção *low-end* para degradar com elegância.
- **UX moderna**: menu hambúrguer acessível, smooth-scroll, animações no scroll, botão “voltar ao topo”.

**Módulos**
- `security`: sanitiza links, impõe `rel="noopener noreferrer"` e `target="_blank"` em externos, frame-busting, logs reduzidos em produção.
- `perf`: eventos passivos, `preconnect` (opcional), prefetch em links internos ao pairar, lazy loader (imagens/iframes e backgrounds via `data-src` / `data-lazy`).
- `ux`: hambúrguer mobile (com `aria-expanded`), smooth-scroll para âncoras, botão “Top”, animações via `IntersectionObserver` usando `[data-animate]` e `data-delay`.
- `forms`: validação progressiva do formulário de contato (live + submit) com feedback acessível; honeypot anti-bot.
- `boot`: detecção de dispositivo *low-end* (Save Data, `deviceMemory`, `hardwareConcurrency`, `prefers-reduced-motion`) e inicialização coordenada.

**Sequência de inicialização (resumo)**
```js
document.addEventListener("DOMContentLoaded", () => {
  MyApp.boot.detectLowEnd();

  MyApp.security.stripDangerousHrefs();
  MyApp.security.hardenLinks();
  MyApp.security.frameBust();

  MyApp.perf.setupPassiveEvents();
  MyApp.perf.preconnectCDNs();   // opcional
  MyApp.perf.lazyLoader();       // imagens/iframes/backgrounds
  MyApp.perf.prefetchOnHover();  // rotas internas

  MyApp.ux.initHamburger();
  MyApp.ux.smoothScroll();
  MyApp.ux.backToTop();
  MyApp.ux.onScrollAnimations();

  MyApp.forms.liveValidation();
  MyApp.forms.validateContactForm();
});
🔐 Segurança (Frontend)
Sanitização de href: remove javascript:/data: ou URLs inválidas.

rel="noopener noreferrer" em links externos (anti-tabnabbing).

Frame-busting: bloqueia renderização do site em iframes de terceiros.

Silenciamento/controle de logs em produção.

Servidor/Host (recomendado): CSP estrita, X-Frame-Options/frame-ancestors, Referrer-Policy, X-Content-Type-Options.

⚡ Performance
Eventos passivos ({ passive:true }) para rolagem suave em mobile.

requestIdleCallback com polyfill: tarefas leves fora do caminho crítico.

Preconnect (opcional) para CDNs (Google Fonts, cdnjs).

Prefetch on-hover: aquece rotas internas ao passar o mouse (dwell curto).

Lazy loading avançado:

Imagens/iframes: usar class="lazy" + data-src="..." (o script injeta src e tenta decode()).

Backgrounds: usar data-lazy="caminho/da/imagem.jpg" (aplica background-image on-view).

Low-End Mode: reduz/evita animações pesadas e prefetch agressivo.

🧩 Integrações HTML/CSS (snippets úteis)
Favicons & Manifest (em TODAS as páginas):

html
Copiar código
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="48x48" href="favicon-48x48.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#0f8c95">
Logo (header/footer) — sem achatamento:

html
Copiar código
<img src="logo-advic-512.png" alt="Logo ADVIC" class="logo-img" height="52">
<!-- no footer, height 56 -->
CSS da logo (já incluso no style.css):

css
Copiar código
.logo-img{
  height:52px; width:auto; object-fit:contain; aspect-ratio:auto;
  image-rendering:-webkit-optimize-contrast;
}
.footer-brand .logo-img{ height:56px; }
@media (max-width:576px){
  .logo-img{ height:44px }
  .footer-brand .logo-img{ height:48px }
}
Lazy assets (HTML):

html
Copiar código
<img class="lazy" data-src="imagens/min-louvor.jpg" alt="Ministério de Louvor">
<iframe data-src="https://www.google.com/maps/embed?..."></iframe>
<div class="hero-bg" data-lazy="imagens/imagem-igreja.jpg"></div>
Animações on-scroll (HTML):

html
Copiar código
<div data-animate="fade-up" data-delay="160">...</div>
💻 Rodando Localmente
Site estático: abra index.html no navegador.
Ou use um servidor simples para testes de rota/links:

Python 3

bash
Copiar código
python -m http.server 8080
# http://localhost:8080
Node (http-server)

bash
Copiar código
npm i -g http-server
http-server -p 8080 .
# http://localhost:8080
🚀 Deploy no GitHub Pages
Adicione/atualize arquivos e faça commit:

bash
Copiar código
git checkout main

git add index.html sobre.html eventos.html contato.html style.css script.js \
        favicon.ico favicon-16x16.png favicon-32x32.png favicon-48x48.png \
        apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png \
        site.webmanifest logo-advic-512.png README.md

git commit -m "feat(site): favicons + webmanifest + logo responsiva (sem achatamento) + head atualizado"
git push origin main
Ative o Pages: no GitHub → Settings → Pages

Build and deployment: Deploy from a branch

Branch: main, Folder: /(root)

Salve. A URL pública será exibida nas Settings.

(Opcional) Domínio customizado:

Configure o CNAME em Settings → Pages

Aponte o DNS conforme a doc do GitHub Pages e marque Enforce HTTPS.

✅ Checklist de QA
 Páginas index/sobre/eventos/contato sem 404.

 Favicons/Manifest reconhecidos (DevTools → Application → Manifest).

 Logo sem achatamento no header/rodapé.

 Lazy: imagens & mapa carregam ao rolar.

 Prefetch em links internos (ver Network ao pairar).

 Form de contato: validação live + submit, honeypot ok.

 Links externos com rel="noopener noreferrer".

 Site fora de iframes de terceiros (frame-busting).

🔧 Roadmap sugerido
SEO: schema.org (Organization/Event), sitemap.xml, robots.txt.

Sermões: dados em JSON + render estático/cliente.

i18n: estrutura simples de traduções (pt / en).

Form backend: Formspark/Netlify/CF Workers + e-mail transactional.

CI: GitHub Actions (HTML/CSS/links lint + Lighthouse orçamento de performance).

📜 Licença
Uso autorizado para o site da ADVIC. Para reutilização, garanta direitos de imagens e fontes.
