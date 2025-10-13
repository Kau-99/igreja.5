ADVIC — Site Institucional
HTML5 · CSS3 · JavaScript (ES6+) · Bootstrap 5

Construção completa do site da ADVIC — Assembleia de Deus de Vila de Cava com foco em design clean, elegante e moderno, além de alta performance, segurança e acessibilidade.
Inclui quatro páginas principais, folha de estilos global, script modular, pacote de favicons e manifesto (PWA).

 Visão Geral

Minimalista e profissional: espaço em branco, hierarquia clara, microinterações sutis.

Tipografia: Lora (títulos) + Inter (corpo).

Paleta: ciano/teal como cor primária (inspirada na arte de referência), fundos suaves e texto chumbo.

Mobile-first com Bootstrap 5 e customizações para não “parecer template”.

Redes sociais oficiais: Instagram, Facebook, YouTube.

🗂️ Conteúdo do Repositório

index.html

sobre.html

eventos.html

contato.html

style.css

script.js

logo-advic-512.png

favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png

apple-touch-icon.png, android-chrome-192x192.png, android-chrome-512x512.png

site.webmanifest

Importante: os ícones e o arquivo site.webmanifest ficam na raiz do projeto.

 Arquitetura do Front-End (script.js)

Namespace único: MyApp (IIFE) — isola o escopo global e organiza módulos.

Objetivos técnicos

Segurança: sanitização de href, rel="noopener noreferrer" em externos, frame-busting, menos logs em produção.

Performance: lazy de imagens/iframes/backgrounds, prefetch em hover, eventos passivos, requestIdleCallback (com polyfill).

Acessibilidade: navegação por teclado, aria-*, respeito a prefers-reduced-motion.

Resiliência: fallbacks para APIs modernas; Low-End Mode para devices modestos.

UX moderna: menu hambúrguer acessível, smooth-scroll, animações on-scroll, botão “voltar ao topo”.

Módulos

security → hardening de links, anti-tabnabbing, frame-busting, controle de logs.

perf → eventos passivos, preconnect opcional, prefetch on-hover, lazy loader (inclui backgrounds via data-lazy).

ux → hambúrguer com aria-expanded, smooth-scroll, botão Top, animações via IntersectionObserver ([data-animate] e data-delay).

forms → validação progressiva no contato (live + submit), feedback acessível, honeypot anti-bot.

boot → detecção de Low-End (Save Data, deviceMemory, hardwareConcurrency, prefers-reduced-motion) e inicialização.

 Melhorias Entregues Nesta Versão

Favicons + site.webmanifest: pronto para atalho em iOS/Android e cor de tema.

Logo responsiva (sem achatamento): usar logo-advic-512.png + apenas altura no <img>; a largura fica automática (regra no CSS).

Menu hambúrguer acessível (mobile), com estados aria.

Animações on-scroll discretas com IntersectionObserver.

Formulário de contato com validação em tempo real e em envio.

Smooth-scroll em âncoras internas.

Lazy loading avançado para imagens, iframes e backgrounds.

Prefetch de rotas internas ao pairar o mouse.

Low-End Mode para reduzir animações/custos.

Eventos passivos (passive: true) para rolagem fluida.

Hardening de links externos e sanitização de URLs.

 Integrações HTML/CSS — O que conferir

Cabeçalho (<head>): referências aos favicons e site.webmanifest; theme-color configurada.

Logo: logo-advic-512.png em header/footer com classe que define altura; largura automática para manter proporção.

Lazy assets: imagens/iframes com data-src; backgrounds com data-lazy.

Animações: elementos marcados com [data-animate] e (opcional) data-delay.

Formulário: campos obrigatórios, mensagens acessíveis e honeypot.

 Checklist Rápido de QA

Páginas index, sobre, eventos, contato abrem sem erros.

Manifesto e ícones reconhecidos no navegador (Aba Application → Manifest).

Logo não distorce em header/rodapé.

Lazy: imagens e mapa carregam só quando entram em tela.

Prefetch: pairar em links internos aquece a navegação.

Formulário: validação live + submit; navegação por teclado OK.

Links externos: rel="noopener noreferrer".

Site não renderiza dentro de iframes de terceiros.

 Rodando Localmente (resumo)

Abrir index.html diretamente no navegador ou

Executar um servidor local simples (Python/Node) para testar rotas e prefetch.

 Publicação no GitHub Pages (guia curto)

Adicionar/atualizar os arquivos (incluindo favicons, site.webmanifest, logo-advic-512.png, HTMLs, style.css, script.js, README.md).

Commitar com mensagem objetiva e enviar para a sua branch principal.

No GitHub → Settings → Pages → Deploy from a branch → Branch main e Folder / (root) → Save.

A URL do site aparece nas Settings do Pages.

(Opcional) Configurar domínio customizado (CNAME) e Enforce HTTPS.

 Recomendações de Segurança no Host

CSP (Content Security Policy) adequada ao projeto.

frame-ancestors (ou X-Frame-Options) para impedir clickjacking.

Referrer-Policy e X-Content-Type-Options.

🗺️ Roadmap Sugerido

SEO: schema.org (Organization/Event), sitemap.xml, robots.txt.

Sermões: dados em JSON + render estático/cliente.

i18n: estrutura simples de tradução (pt/en).

Form backend: Formspark/Netlify/Cloudflare + e-mail transacional.

CI: GitHub Actions (lint de HTML/CSS/links + orçamentos Lighthouse).

📄 Licença

Uso autorizado para o site da ADVIC. Em reutilizações, verifique direitos de imagens e fontes.
