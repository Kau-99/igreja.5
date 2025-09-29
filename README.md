#  Documentação Técnica - ADVIC Website Scripts

Este documento explica a arquitetura e as decisões de engenharia do arquivo `script.js` do site institucional da Assembleia de Deus Vila de Cava (ADVIC).

---

##  Objetivos do Script

O código foi projetado para:

- Garantir **segurança** no front-end (hardening contra XSS, clickjacking, links maliciosos).
- Melhorar a **performance e fluidez**, inclusive em dispositivos mais antigos.
- Aumentar a **resiliência** (fallbacks quando features modernas não existem).
- Garantir **acessibilidade** (navegação por teclado, aria-atributos).
- Manter uma arquitetura **modular, limpa e expansível**.

---

##  Segurança

- **Sanitização de links:** remove `javascript:` e `data:` de hrefs.
- **Força `rel=noopener noreferrer`:** evita ataques de tabnabbing em links externos.
- **Frame-busting:** bloqueia tentativa de carregar o site em iframes não autorizados.
- **Silenciamento de logs em produção:** reduz exposição de informações sensíveis no console.

> **Nota:** Para produção real, o ideal é configurar também **CSP (Content Security Policy)** no servidor ou GitHub Pages.

---

##  Performance

- **Polyfill de `requestIdleCallback`:** executa tarefas leves sem travar o render.
- **Eventos passivos (wheel/touch):** evita bloqueio de scroll em mobile.
- **Preconnect:** antecipa conexões com CDNs comuns (Google Fonts, cdnjs).
- **Prefetch on-hover:** páginas internas carregam mais rápido quando o usuário passa o mouse.
- **Lazy Loading avançado:** imagens, iframes e backgrounds só carregam quando entram no viewport.
- **Decodificação assíncrona de imagens:** uso de `decode()` quando disponível.

---

## Modo Low-End

Detecta dispositivos limitados via:
- `navigator.connection.saveData`
- `navigator.deviceMemory <= 2`
- `navigator.hardwareConcurrency <= 2`
- `prefers-reduced-motion`

Quando ativo:
- Remove animações/transições pesadas.
- Usa thresholds mais baixos em observers.
- Evita consumo extra de CPU.

---

# Estrutura do Namespace `MyApp`

O código roda dentro de um IIFE e expõe apenas o objeto `MyApp`.

 Configurações
```js
MyApp.config = {
  ENV: 'production' | 'development',
  scrollTopThreshold: 300,
  toastDuration: 3000,
  lazySelector: 'img[data-src], [data-lazy], iframe[data-src]',
  lowEndMode: boolean
}
