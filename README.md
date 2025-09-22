Site Institucional - Assembleia de Deus de Vila de Cava (ADVIC)
Sobre o Projeto
Este é o site que desenvolvi para a Assembleia de Deus de Vila de Cava (ADVIC). O objetivo foi criar uma presença online moderna, acolhedora e informativa para a igreja, servindo como um canal de comunicação central para membros da comunidade e visitantes.

O projeto foi construído do zero, com foco em um design limpo, performance e, acima de tudo, facilidade de uso em qualquer dispositivo.

Funcionalidades Principais
O site conta com diversas seções e funcionalidades para atender às necessidades da igreja:

Design Responsivo: Totalmente adaptado para uma experiência de navegação perfeita em celulares, tablets e desktops.

Páginas Institucionais:

Início: Uma página de boas-vindas com acesso rápido aos cultos e últimos eventos.

Sobre: Apresenta a história da igreja através de uma linha do tempo interativa e animada que revela os marcos conforme o usuário rola a página.

Eventos: Uma área dedicada à divulgação da programação e eventos especiais da igreja.

Contato: Inclui um formulário para envio de mensagens e um mapa integrado para facilitar a localização.

Otimização de Performance:

Lazy Loading: Imagens são carregadas somente quando se aproximam da tela, economizando dados e acelerando o carregamento inicial.

JavaScript Eficiente: O código utiliza técnicas como throttle para eventos de rolagem, garantindo uma animação fluida sem sobrecarregar o navegador.

Acessibilidade: Uso de tags semânticas do HTML5 e atributos ARIA para melhorar a navegação para usuários de tecnologias assistivas.

Componentes Interativos:

Menu de navegação "hambúrguer" para dispositivos móveis.

Botão "Voltar ao Topo" que aparece de forma suave.

Animações sutis em cards e outros elementos para uma experiência mais dinâmica.

Tecnologias Utilizadas
Para construir este site, utilizei as seguintes tecnologias:

HTML5: Estrutura semântica e bem organizada.

CSS3: Estilização completa com recursos modernos como:

Flexbox e Grid Layout para alinhamento e estrutura.

Variáveis CSS para um tema de cores consistente e fácil de manter.

Media Queries para a responsividade.

Animações e Transições para interatividade.

JavaScript (ES6+): Para toda a interatividade do site, incluindo:

Manipulação do DOM.

Menu responsivo.

Intersection Observer API para animar elementos na rolagem (como a timeline) e para o lazy loading.

Font Awesome: Para os ícones de redes sociais e interface.

Google Fonts: Para a tipografia do projeto.

Estrutura de Arquivos
O projeto está organizado da seguinte forma:

/
├── index.html          # Página Inicial
├── sobre.html          # Página Sobre Nós com a timeline
├── eventos.html        # Página de Eventos
├── contato.html        # Página de Contato com formulário e mapa
├── style.css           # Folha de estilos principal
├── script.js           # Arquivo JavaScript com toda a lógica
└── imagens/
    ├── logo.png
    └── ... (demais imagens do projeto)
Como Executar Localmente
Este é um projeto estático, então não há necessidade de um processo de build complexo. Para rodar em sua máquina local:

Clone este repositório:

Bash

git clone https://github.com/seu-usuario/nome-do-repositorio.git
Navegue até o diretório do projeto:

Bash

cd nome-do-repositorio
Abra o arquivo index.html diretamente no seu navegador.

Dica: Para uma melhor experiência de desenvolvimento, recomendo usar a extensão Live Server no Visual Studio Code, que atualiza o site automaticamente a cada alteração.
