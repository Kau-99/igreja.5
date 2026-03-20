ADVIC — Site Institucional
Stack: HTML5 · CSS3 · Vanilla JavaScript (ES6+) · Bootstrap 5 · PWA (Service Workers)

Construção completa do site da ADVIC (Assembleia de Deus de Vila de Cava). Este projeto foi desenvolvido com foco em alta performance, acessibilidade nativa, segurança e facilidade de manutenção.

A arquitetura do projeto evoluiu para um modelo dinâmico (Headless-lite), permitindo que a equipe da igreja atualize conteúdos frequentemente (eventos e pregações) através de arquivos JSON, sem necessidade de alterar o código HTML ou possuir um banco de dados complexo.

Visão Geral e Arquitetura
O front-end foi projetado para ser leve e não depender de frameworks JavaScript pesados (como React ou Angular), utilizando apenas Vanilla JS modularizado.

Dinamismo via Fetch API: As páginas de Início e Eventos consomem dados estruturados de sermoes.json e eventos.json. O JavaScript renderiza os componentes na tela dinamicamente.


Progressive Web App (PWA): Implementação de Service Worker (sw.js) e site.webmanifest. O site faz cache de assets (HTML, CSS, JS, imagens), permitindo carregamento quase instantâneo e navegação offline básica, além de poder ser "instalado" em dispositivos móveis.

Tipografia Fluida e UI Moderna: Utilização da função clamp() no CSS para escalonamento perfeito de fontes em qualquer resolução. O header conta com efeito Glassmorphism (backdrop-filter) para uma interface mais sofisticada.

SEO Avançado: Implementação de marcação de dados estruturados (JSON-LD / Schema.org) do tipo Church, facilitando a indexação inteligente pelo motor de busca do Google.

Funcionalidades Técnicas (script.js)
O arquivo principal de script opera sob um namespace único (MyApp) para isolamento de escopo e está dividido em módulos funcionais:

Segurança: Hardening de links externos (rel="noopener noreferrer" forçado em runtime), frame-busting (proteção contra clickjacking), sanitização de URLs e bloqueio do console em ambiente de produção.

Performance (Lazy Load & Prefetch): Uso extensivo da API IntersectionObserver para adiar o carregamento de imagens (data-src), iframes (como o mapa do Google) e background-images (data-lazy). Links internos recebem prefetch no evento de mouseenter.

Formulários Assíncronos: O formulário de contato foi integrado ao Formspree via AJAX (Fetch API). Possui validação progressiva nativa, feedback visual de envio e proteção Honeypot contra bots, eliminando o recarregamento da página.

Acessibilidade (a11y): Painel de acessibilidade customizado controlado via teclado ou mouse. Inclui controle de contraste, escala de fonte, desativação de animações (prefers-reduced-motion) e integração com a Web Speech API para leitura de tela nativa. O estado é persistido no localStorage.

Estrutura do Repositório
index.html: Home page dinâmica com consumo de sermões recentes via JSON.

sobre.html: História, linha do tempo (timeline on-scroll) e liderança.

eventos.html: Listagem de eventos gerada via JSON com filtro interativo de categorias.

contato.html: Formulário integrado ao Formspree e mapa embutido.

privacidade.html: Política de dados e LGPD.

style.css: Tokens de design (variáveis CSS), tipografia fluida e utilitários.

script.js: Core da aplicação (PWA, segurança, lazy load, renderização JSON).

sw.js: Service Worker responsável pelo cache e funcionamento offline.

eventos.json / sermoes.json: "Bancos de dados" locais para fácil atualização de conteúdo.


site.webmanifest e pacotes de ícones (favicon, apple-touch-icon, etc): Configurações para instalação como app mobile.

Fluxo de Atualização de Conteúdo
Para a equipe de mídia/secretaria atualizar o site, não é necessário conhecimento em HTML:

Novos Eventos: Editar o arquivo eventos.json, adicionando um novo bloco com título, data, imagem e link do calendário. O JavaScript cuidará da montagem do card e da paginação/filtro.

Novos Sermões: Editar o arquivo sermoes.json adicionando o link do YouTube e do áudio (se houver). O sistema identificará automaticamente a disponibilidade de mídia para renderizar o botão correto.

Deploy e Configuração Local
Execução Local:
Devido às requisições da Fetch API (arquivos JSON) e do Service Worker, o projeto precisa rodar sob um servidor local (ex: extensão Live Server do VS Code, ou python -m http.server). Abrir o arquivo HTML diretamente (file:///) causará bloqueio de CORS na leitura dos dados.