# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versões em
[SemVer](https://semver.org/lang/pt-BR/). Enquanto estiver em `0.x`, versões menores podem mudar o formato dos
dados; quando isso acontecer, a nota da versão avisa.

## [0.8.0] — 2026-11-27

O menu de baixo da barra lateral pode ser recolhido.

### Adicionado
- **Recolher o menu da barra lateral:** o botão **Menu ▾** acima de Repositórios, Contar a boiada, Curral e
  Configurações recolhe e abre esses atalhos, liberando espaço para a lista de tropas. O app lembra se ficou aberto
  ou recolhido.

## [0.7.0] — 2026-11-26

O Berrante chega ao Windows (x64 e ARM64), sem mudar nada no macOS.

### Adicionado
- **Windows 10/11:** instaladores `.exe` (NSIS, por usuário) e `.zip` para x64 e arm64 (`yarn dist:win`). Sem 32 bits: o Electron não publica mais essa build.
- Os passos rodam no **Git Bash** do Git for Windows, com os mesmos comandos do macOS; sem ele, no Prompt de Comando.
- **Recolher no Windows:** a árvore de processos de cada serviço é encerrada com `taskkill /T /F`.
- **Contar a boiada no Windows:** portas pelo `netstat` e processos pelo PowerShell (`Win32_Process`), com a tropa
  dona de cada porta.
- **Terminal no Windows:** Windows Terminal (padrão), PowerShell, Prompt de Comando ou Git Bash.
- **VS Code no Windows:** abre o `Code.exe` da instalação do usuário ou do sistema.
- Ícone azul na área de notificação, menus Arquivo/…/Ajuda na janela e atalhos com `Ctrl`.
- Aviso ao abrir a versão x64 num Windows ARM.

### Alterado
- Atalhos do menu passam a ser `CmdOrCtrl` (no macOS continuam `⌘`).

## [0.6.2] — 2026-11-26

Serviço fora do play deixa de aparecer apagado no painel.

### Alterado
- **Serviço fora do play:** a linha não fica mais esmaecida, então o ▶, o log e a porta continuam legíveis. No
  lugar do número aparece `··` (com dica), a etiqueta **fora do play** fica laranja e a numeração conta só os
  passos que sobem com o play, na ordem da subida.

## [0.6.1] — 2026-11-26

Correção da vistoria: cada porta aparece só no passo que a usa.

### Corrigido
- **Vistoria acusava a mesma porta em vários passos:** o `PORT` do `.env` passou a valer para todo passo da pasta
  (`docker compose up -d`, workers). Agora só conta para o passo que abre a porta (segue ao abrir uma porta ou ao
  responder).
- Os comandos na vistoria mostram `~` no lugar da pasta do usuário.

## [0.6.0] — 2026-11-26

Troque a porta ocupada direto pela vistoria, sem caçar o `.env` na mão.

### Adicionado
- **Mudar porta na vistoria:** em cada porta ocupada, o botão **Mudar porta** sugere uma porta livre na máquina e
  em nenhuma tropa (passos desligados inclusive), mostra cada linha de `.env` que muda (a do serviço e os endereços
  que apontam para ela em outros repos da tropa, como `VITE_API_URL`) e só grava depois de confirmar. Porta de
  compose vinda de `${VAR:-porta}` vira `VAR` no `.env`.
- Quando a porta não vem do `.env` (fixa no compose ou no env do passo), a vistoria avisa que o correto é declarar no
  `.env`.

### Mudado
- A vistoria passa a enxergar o `PORT` do `.env` da pasta do passo, não só o do env do passo.

## [0.5.0] — 2026-11-26

Ferramentas do dia a dia: git da tropa, vistoria antes de subir, perfis e atalhos.

### Adicionado
- **Marcar a tropa:** cada repositório mostra a branch, as alterações não salvas e os commits à frente/atrás do
  remoto. No menu **⋮ Mais**: **Atualizar repos (pull)** em todos de uma vez e **Buscar novidades (fetch)**.
- **Trocar de pasto:** troca de branch em todos os repositórios da tropa que a têm; quem tem alteração não salva fica
  onde está.
- **Conferir porteiras:** botão no cabeçalho da tropa que faz a vistoria sem subir nada.
- **Vistoria do pasto:** antes de tocar o berrante (e no botão **Conferir porteiras**), além das portas ocupadas, avisa
  quando falta `.env` ou variável do `.env.example`, com botão para **criar** ou **completar** o `.env` (só anexa as
  chaves que faltam, nunca reescreve).
- **Segue ao responder (health):** um passo pode esperar uma URL local (`http://localhost:3000/health`) responder antes
  de liberar o próximo.
- **Reinicia sozinho se cair:** opção por passo; até 3 tentativas em 5 minutos, com espera crescente.
- **Perfis da tropa:** subconjuntos de passos (ex.: "só a API") criados em **Plano de subida → Perfis** e escolhidos no
  cabeçalho da tropa.
- **Avisos do macOS** quando a boiada sobe, um passo falha ou um serviço cai (com a janela fora de foco; desligue em
  **Configurações → Dia a dia**).
- **Berrante na barra de menu:** tocar e recolher cada tropa sem abrir a janela, com o total de processos de pé.
- **Duração da última subida** no cabeçalho da tropa.
- **Log:** busca (Enter / ⇧Enter), **próximo erro** e **copiar** o log inteiro sem as cores ANSI.
- **Atalhos:** clicar numa porta abre `http://localhost:<porta>` no navegador; o botão `>_` abre o terminal (Terminal,
  iTerm, Warp ou Ghostty) na pasta do repositório.
- **Vários repositórios de uma vez:** selecione e clone vários do GitHub juntos, importe várias pastas locais no mesmo
  diálogo (⌘-clique) e, na tropa, filtre e marque todos.

### Mudado
- **Ações da tropa em duas colunas:** Tocar o berrante e Recolher lado a lado, Conferir porteiras e **⋮ Mais**
  embaixo. O **Abrir no VS Code** (`⌘O`) foi para o menu **⋮ Mais**.
- **Placar "processos de pé":** o número grande e o de cada repositório contam só os processos que ficam rodando;
  repositório que só tem passos de preparo (rede, `docker compose up -d`) mostra **só preparo**.

## [0.4.0] — 2026-11-26

Abra o código da tropa no VS Code com um clique.

### Adicionado
- **Workspace do VS Code na tropa:** escolha um `.code-workspace` em **Editar tropa** e abra pelo botão
  **VS Code** no cabeçalho da tropa (ou `⌘O`). Abre pelo app do VS Code, sem precisar do comando `code` no PATH.

## [0.3.0] — 2026-11-26

Controle dos containers Docker de dentro do Berrante.

### Adicionado
- **Curral** (`⇧⌘D`): todos os containers Docker da máquina, ao vivo, com estado, health, portas, projeto compose e
  tropa dona; **parar**, **subir** e **reiniciar** cada um.
- Aba **Containers** na tropa (`⌥⌘3`): os containers que os passos `docker compose … up` do workflow sobem, com o
  estado de cada serviço e **subir / parar / reiniciar** um a um ou a stack inteira, sem tocar o berrante.

## [0.2.1] — 2026-11-26

Correções de instalação no macOS.

### Corrigido
- **"Berrante está danificado":** os instaladores saíam com a assinatura `linker-signed` do Electron, que quebra ao
  renomear o app; baixado pelo navegador, o macOS recusava abrir. Agora o app é assinado ad-hoc e selado por inteiro
  (continua sem notarização: na primeira vez, use **Abrir Mesmo Assim**).
- `yarn dist` apaga as cópias `.app` descompactadas em `release/`, que o Spotlight podia abrir no lugar do app
  instalado.

### Adicionado
- Aviso quando a versão Intel roda pelo Rosetta num Mac Apple Silicon, com link para o instalador `arm64`.
- Oferta de **Mover para Aplicativos** quando o Berrante é aberto de fora (de dentro do `.dmg` ou de Downloads).
- O log de abertura registra a arquitetura, o Rosetta e o caminho do app.

## [0.2.0] — 2026-11-26

O plano de subida virou um **workflow**: passos que rodam de cima para baixo, como você faria no terminal.

### Mudado
- **Plano de subida → workflow:** cada passo tem nome, pasta, comando, env e **"segue ao"** (terminar, abrir uma
  porta ou iniciar). Não há mais "depende de" nem tipo travado: a ordem é a da lista, e se um passo falhar os
  seguintes não rodam.
- **Containers mais rápidos:** um passo `docker compose up -d` por repositório, que segue assim que o comando
  termina, em vez de uma linha por container esperando o healthcheck. Recolher a boiada roda `docker compose stop`
  na mesma pasta.
- **Detecção na ordem de um dev:** rede → containers → `dev` da API → workers → front-end por último.
- **IA como sugestão de workflow:** "Sugerir workflow com IA" devolve a sequência numerada com o porquê de cada
  passo; você usa como seu workflow ou adiciona só os passos marcados ao final.
- **Só macOS:** os instaladores de Windows e Linux saíram; as primeiras versões rodam apenas no macOS.

### Adicionado
- Seletor de pasta por passo, restrito aos repositórios da tropa.
- Loading no confirmar do 2FA enquanto a ação roda, sem aceitar cliques repetidos.

### Migração
- Planos salvos na 0.1.0 continuam rodando. Clique em **Detectar de novo** e depois em **Salvar workflow** para
  trocar as linhas antigas de um container por serviço pelo passo único de `docker compose up -d`.

## [0.1.0] — 2026-11-25

Primeira versão pública.

### Adicionado
- **Tropas:** juntam N repositórios que sobem juntos, com nome, cor e peça.
- **Plano de subida detectado:** lê lockfile ou `packageManager`, `docker compose config`, scripts do
  `package.json`, os blocos de shell do README e o `.env.example`. O plano é editável e re-detectar preserva as
  edições.
- **Tocar o berrante / Recolher a boiada:** sobe containers, etapas de preparo e scripts na ordem certa, com logs
  ao vivo (xterm), grupos de processos próprios e parada com `SIGTERM` → `SIGKILL`. Ao fechar o app, você escolhe
  entre recolher e manter rodando, e os processos são reconhecidos na próxima abertura.
- **Contar a boiada:** portas TCP abertas e PIDs da máquina (`lsof` + `ps`), com dono por tropa e encerramento de
  processo.
- **GitHub:** login por Device Flow ou pelo `gh` CLI, listagem, clone e pull (token só no ambiente do `git`, nunca
  na URL).
- **IA opcional:** Claude Code ou Antigravity em modo somente leitura sugerem ajustes no plano como um diff que
  você aprova item a item.
- **2FA (TOTP)** com QR e códigos de recuperação, exigido para a IA e para encerrar processos de fora.
- **Visual de painel de telemetria:** números em matriz de pontos, 9 cores de destaque com fundo tingido pelo tom
  escolhido e o tema pronto **Drácula** (paleta oficial).
- **Menu nativo e atalhos:** `⌘N`, `⌘↩`, `⇧⌘↩`, `⌘1`…`⌘9` e outros.
- **Instaladores:** macOS (`.dmg`/`.zip`, Apple Silicon e Intel).

### Limitações conhecidas
- **Só macOS:** Windows e Linux não são suportados nas primeiras versões.
- App não assinado: o Gatekeeper do macOS pede confirmação na primeira abertura.
