# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versões em
[SemVer](https://semver.org/lang/pt-BR/). Enquanto estiver em `0.x`, versões menores podem mudar o formato dos
dados; quando isso acontecer, a nota da versão avisa.

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
