# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versões em
[SemVer](https://semver.org/lang/pt-BR/). Enquanto estiver em `0.x`, versões menores podem mudar o formato dos
dados; quando isso acontecer, a nota da versão avisa.

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
- **Instaladores:** macOS (`.dmg`/`.zip`, Apple Silicon e Intel), Windows (assistente NSIS x64 e ARM64, com
  escolha da pasta e de "só para mim" ou "todos os usuários") e Linux (`.deb` e AppImage, x64 e ARM64).

### Limitações conhecidas
- **Windows:** instala e abre, mas ainda não sobe serviços nem lista portas.
- **Linux:** pouco testado.
- Apps não assinados: o Gatekeeper do macOS e o SmartScreen do Windows pedem confirmação na primeira abertura.
