# Desenvolvimento do Berrante

Como rodar, testar, empacotar e como o app é organizado por dentro. Para instalar e usar, veja o
[guia de instalação](guia-instalacao.md).

## Ambiente

Requisitos: Node 24 (`.nvmrc`), Yarn 1.22 e Docker Desktop (opcional, só para compose). O `gh` CLI também é
opcional e serve de atalho de login. No Windows, também o Git for Windows (o Berrante roda os passos no Git Bash).

Dá para desenvolver no macOS ou no Windows: `yarn dev`, `yarn test` e `yarn typecheck` funcionam nos dois.

```bash
yarn install            # baixa o Electron e prepara deps nativas
cp config/.env.example config/.env   # preencha BERRANTE_GITHUB_CLIENT_ID (veja abaixo)
yarn dev
```

### Criando a OAuth App do GitHub (Device Flow)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. *Application name*: `Berrante (local)`. *Homepage URL*: `http://localhost`. *Authorization callback URL*:
   `http://localhost` (o Device Flow não usa callback, mas o campo é obrigatório).
3. Depois de criar, marque **Enable Device Flow** e salve.
4. Copie o **Client ID** para `config/.env` em `BERRANTE_GITHUB_CLIENT_ID=`. Não gere client secret: o Device Flow
   não precisa dele.
5. O app pede os escopos **`repo`** (repos privados e clone) e **`read:user`** (perfil).
   Para repos de organizações com *OAuth App access restrictions*, aprove o app na org.

O client_id é injetado no build (`electron.vite.config.ts`). Em dev, a variável de ambiente de mesmo nome também é
aceita.

**Atalho**: na tela de login, use "Importar sessão do gh". Ele lê o token com `gh auth token`.

## Scripts

| Comando | O que faz |
|---|---|
| `yarn dev` | electron-vite com HMR no renderer |
| `yarn typecheck` | `tsc` nos projetos node (main/preload/shared/tests) e web (renderer) |
| `yarn test` | vitest: detector de startup, parser do README, parser do lsof, contrato IPC e tema |
| `yarn build` | typecheck + bundle em `out/` |
| `yarn dist` | build + `.dmg` e `.zip` do macOS (arm64 e x64) em `release/<versão>/` |
| `yarn dist:dir` | build + `.app` sem empacotar (mais rápido para testar) |
| `yarn dist:win` | build + instaladores NSIS (`.exe`) e `.zip` do Windows (x64 e arm64) em `release/<versão>/` |
| `yarn dist:win:dir` | build + app do Windows x64 sem empacotar, em `release/<versão>/win-unpacked` |
| `yarn icon` | regenera `build/icon.png` e `resources/icon.png` (peça "cadeirinha" do Tetris em LEDs, ver abaixo) |

Os instaladores saem **sem assinatura** (veja o [guia de instalação](guia-instalacao.md) para abrir no macOS e passar
pelo SmartScreen no Windows). O Berrante roda no **macOS** e no **Windows**; em outro sistema ele avisa e fecha.

Cada sistema empacota o seu: `yarn dist` num Mac e `yarn dist:win` num Windows (o NSIS do Windows não roda no
macOS sem Wine). O `dist:win` gera as duas arquiteturas a partir de uma máquina x64: não há dependência nativa, então o
electron-builder só baixa o Electron de cada arquitetura. Para **rodar** o build `arm64` é preciso um Windows ARM (ou
uma VM ARM). Windows 32 bits (`ia32`) ficou de fora: o Electron parou de publicar essa build.

Variáveis só de dev (ignoradas no app empacotado):

| Variável | O que faz |
|---|---|
| `BERRANTE_USER_DATA=/pasta` | usa outra pasta de dados (ex.: dados de demonstração) |
| `BERRANTE_CAPTURE=/arquivo.png` | salva um print da janela depois de carregar (`BERRANTE_CAPTURE_DELAY`, padrão 3500 ms) |
| `BERRANTE_SHOTS=/pasta` | percorre as telas principais, salva um print de cada, confere o botão Copiar e fecha o app |

Os prints do README são gerados assim, com a tropa fictícia **Fazenda** em `BERRANTE_USER_DATA`, para não expor
projetos reais. `node scripts/demo-shots.mjs` monta tudo a partir de `tests/fixtures/repos` em `.demo/` (scripts viram
servidores Node mínimos e o compose usa imagens leves em portas livres), sobe a tropa, salva os prints em
`.demo/shots/` e recolhe a boiada. Depois copie os que mudaram para `docs/images/` e derrube os containers com
`node scripts/demo-shots.mjs --down`.

## Aparência

O visual é de painel de telemetria: fundo quase preto, números em matriz de pontos e blocos pixelados.

- **Cor de destaque**: em **Configurações → Aparência** há 9 opções: Azul (padrão), Verde-limão, Verde, Ciano,
  Laranja, Rosa, Roxo, Vermelho e Âmbar.
- **Tingir o fundo**: ligado, o fundo, os painéis, as bordas e o texto secundário puxam o tom do destaque (azul vira
  azul-marinho quase preto). Desligado, ficam em preto e cinza neutros.
- **Temas prontos**: o **Drácula** traz a paleta oficial inteira (`preset` em `ACCENTS`) e ignora o "tingir".
- **Grid de fundo**: liga ou desliga a malha quadriculada atrás do conteúdo.

As cores saem de `src/shared/theme.ts` (`deriveTheme`), que gera variáveis CSS `--c-<token>` como triplas RGB. O
Tailwind lê essas variáveis (`rgb(var(--c-x) / <alpha-value>)`), e a janela nativa usa o mesmo fundo
(`windowBackground`) para não piscar antes do CSS carregar. As cores de status (verde, laranja, vermelho…) são fixas.
`tests/unit/theme.test.ts` garante que o fundo sai escuro e no tom do destaque.

**Ícone**: a peça "cadeirinha" (Z) do Tetris em LEDs azuis acesos, sobre uma placa azul-marinho com a matriz de LEDs
apagados. É gerado por `scripts/make-icon.mjs` (sem assets de terceiros), com blocos alinhados ao pixel para ficar
nítido até em 32 px. O electron-builder converte o PNG em `.icns`. Em dev
o mesmo PNG é aplicado no Dock. A sidebar usa a mesma peça ao lado do nome.

## Menu e atalhos

Os atalhos são `CmdOrCtrl`: no Windows, troque `⌘` por `Ctrl` e `⌥` por `Alt`.

| Atalho | Ação |
|---|---|
| `⌘N` | Nova tropa |
| `⌘E` | Editar a tropa aberta |
| `⌘↩` | Tocar o berrante |
| `⇧⌘↩` | Recolher a boiada |
| `⌥⌘1` / `⌥⌘2` | Abas Boiada / Plano de subida |
| `⌘1` … `⌘9` | Ir para a tropa N (o menu Tropa lista todas e se atualiza ao criar, renomear ou apagar) |
| `⇧⌘R` | Repositórios |
| `⇧⌘P` | Contar a boiada |
| `⌘,` | Configurações |

O menu **Tropa** também tem "Recolher todas as tropas". O menu **Ajuda** abre a pasta de dados, o log do Berrante e a
página de OAuth Apps do GitHub. O menu fica em `src/main/ui/appMenu.ts` e manda comandos ao renderer pelo evento
`menu:command`, assinados com o hook `useMenuCommand`. Se a janela estiver fechada, o app reabre a janela e executa o
comando.

O macOS mostra na barra de menus e no Dock o nome do bundle. No app empacotado o electron-builder grava "Berrante"
no `Info.plist`. Em `yarn dev`, o `scripts/dev-app-name.mjs` (rodado no `postinstall` e no `predev`) renomeia o
`Electron.app` de `node_modules` para "Berrante".

## Arquitetura

```
src/
├─ shared/          tipos de domínio + contrato IPC (schemas zod, tipos de saída, allowlist de canais)
├─ main/            toda a lógica de sistema (Clean Architecture + DDD)
│  ├─ domain/       entidades (Project, ServiceDefinition, RunningProcess, PortBinding, LocalRepository),
│  │                interfaces de repositório e ports de infra, AppError
│  ├─ application/  um use case por arquivo (auth, github, projects, startup, runtime, ports, security, settings)
│  │  └─ startup/detectors/  detecção determinística e pura (testada)
│  ├─ infra/        GitHub HTTP, git (GIT_ASKPASS), JSON em userData, safeStorage, ProcessManager,
│  │                DockerCliAdapter, LsofPortScanner, AiCliAdapter, ShellEnv
│  ├─ ipc/          registerIpc (valida com zod, checa a origem, envelope de erro) + controllers finos
│  ├─ ui/           menu nativo da aplicação e painel "Sobre"
│  └─ container.ts  composition root (DI manual)
├─ preload/         contextBridge → window.berrante (invoke em canais da allowlist + eventos)
└─ renderer/        React 18 + Tailwind (tokens do tema em CSS vars, derivados da cor de destaque) + Radix
```

### Decisões

- **Segurança do Electron**: `contextIsolation`, `sandbox`, `nodeIntegration: false` e CSP restrita (só relaxa o
  inline script do HMR em dev). Também bloqueiam navegação e janelas novas, negam permissões, e o IPC só aceita
  chamadas da própria página.
- **Erros**: use cases lançam `AppError(code, message)`. Um handler único loga e devolve `{ ok:false, error }`, sem
  stack nem segredos. O renderer converte em `BerranteError`.
- **Segredos**: token do GitHub, secret TOTP e hashes dos códigos de recuperação ficam num cofre único cifrado com
  `safeStorage` (Keychain). Se a criptografia não estiver disponível, o app falha em vez de gravar em texto puro. O
  logger redige padrões de token.
- **Clone/pull**: a URL fica limpa e o token vai por `GIT_ASKPASS` apenas no env do processo filho, com
  `credential.helper=` vazio para não gravar no Keychain do git.
- **Processos**: `spawn(shell, ['-c', cmd], { detached: true })` cria um process group próprio (pgid = pid). A
  saída vai para um arquivo em `userData/logs/services`, para que "Manter rodando" ao fechar o app não mate a boiada
  por SIGPIPE. Na próxima abertura os PIDs são re-adotados (`runtime-state.json`). O stop envia `SIGTERM` para
  `-pgid` e, após o timeout configurável, `SIGKILL`.
- **PATH de app GUI**: o ambiente do shell de login (`$SHELL -ilc env`) é resolvido uma vez, para que nvm, homebrew e
  `~/.local/bin` funcionem.
- **Detecção** (`application/startup/detectors`): funções puras sobre o conteúdo dos arquivos.
  - Gerenciador: o campo `packageManager` vence o lockfile.
  - Scripts: classificados em serviço longo ou ação.
  - Compose: `docker compose --profile '*' config --format json`, com fallback em YAML. Profiles ficam desligados.
  - README: blocos shell das seções de setup/rodar/subir, em pt e en. Um `docker compose up a b` no README
    restringe quais containers entram no play, e `docker network create` vira etapa idempotente.
  - `.env.example`: só as chaves são comparadas.
  - Re-detectar preserva o que você editou no plano.
- **IA** (opcional): `claude -p --output-format json --json-schema … --tools Read,Glob,Grep` ou
  `agy -p --output-format json --json-schema … --mode plan`, ou seja, somente leitura. A resposta é validada com
  zod, os `cwd` ficam presos ao repo e o resultado vira um diff que você marca item a item. Nada é executado sem
  confirmação.
- **2FA**: TOTP (otplib) com QR e 10 códigos de recuperação (só o hash SHA-256 é salvo). Há bloqueio de replay, lockout
  após 5 erros e uma elevação de 5 minutos por escopo. O código é exigido para habilitar e usar a IA e para matar
  processos que não são do Berrante.

### Dados

Em `~/Library/Application Support/Berrante/` (macOS) ou `%APPDATA%Berrante` (Windows): `projects.json`, `repositories.json`, `settings.json`,
`runtime-state.json`, `secrets.bin` (cifrado), `logs/berrante.log` (JSON lines) e `logs/services/*.log`.

## Testes

`yarn test` roda sobre fixtures em `tests/fixtures/repos`: README, `package.json` e compose de um projeto fictício
(`fazenda-api`, `fazenda-web` e `fazenda-logs`), com `.env.example` só com chaves.

## macOS e Windows

Tudo que toca o SO passa por ports, e o `container.ts` escolhe o adapter de cada sistema. Os use cases são os mesmos.

| Peça | macOS | Windows |
|---|---|---|
| Shell dos passos (`ShellEnv`) | `$SHELL -c`, com o `PATH` do shell de login | Git Bash (`<Git>inash.exe -c`); sem ele, `cmd.exe /d /s /c` |
| Process group (`ProcessManager`) | `detached` cria o grupo (pgid = pid do shell) | não existe: o "grupo" é a árvore que nasce no shell |
| Recolher | `SIGTERM` no grupo, `SIGKILL` após o timeout | `taskkill /PID <shell> /T /F` (console não tem SIGTERM de fora) |
| Portas (`PortScannerGateway`) | `LsofPortScanner`: `lsof` + `ps` | `WindowsPortScanner`: `netstat -ano` + `Get-CimInstance Win32_Process` |
| Terminal | `MacTerminal`: `open -a` (Terminal, iTerm, Warp, Ghostty) | `WindowsTerminal`: Windows Terminal, PowerShell, Prompt de Comando, Git Bash |
| VS Code | `open -b com.microsoft.VSCode` | `Code.exe` (instalação do usuário, do sistema ou a do `code` no PATH) |
| Cofre (`safeStorage`) | Keychain | DPAPI |
| Janela e menu | barra embutida com os semáforos; menu do app | moldura padrão; menus Arquivo/…/Ajuda na janela |
| Bandeja | ícone template na barra de menus | ícone azul na área de notificação (clique abre o menu) |

Detalhes do Windows:

- Todo `execFile`/`spawn` leva `windowsHide: true`; sem isso cada `git`, `docker` ou `netstat` pisca uma janela de
  console. O `detached` continua: no Windows ele tira o serviço do job do Electron, para que "Manter rodando" funcione.
- Sem process group, a porta de um serviço é achada subindo o PPID do processo que escuta até o shell do serviço
  (`buildProcessTable`). Um "pai" criado depois do filho é ignorado (PID reaproveitado).
- O `netstat` sai traduzido ("ESCUTANDO"), então uma linha TCP está em LISTEN quando o endereço remoto tem porta 0.
- O Windows não informa a pasta de trabalho de outro processo: a coluna de pasta do Contar a boiada fica vazia.
- A tabela de processos (PowerShell, ~1 s) é reaproveitada por 5 s e renovada quando aparece um PID novo em LISTEN; o
  dono de cada processo (`GetOwner`, lento) é buscado em segundo plano.
- O `which()` só aceita `.exe`/`.com`: um `.cmd` exigiria `cmd.exe` e reabriria a porta para injeção. As CLIs de IA
  são procuradas como `%USERPROFILE%.localinclaude.exe` / `agy.exe`.
- O `GIT_ASKPASS` continua um script `#!/bin/sh`: o Git for Windows roda scripts com shebang pelo próprio `sh`.
- Atalhos usam `CmdOrCtrl`: `⌘` no macOS, `Ctrl` no Windows. O renderer recebe o sistema pelo preload
  (`window.berrante.platform`) para trocar textos e atalhos.

## Montar uma versão

O passo a passo (build, SHA-256, tag e release) está em [`versions/README.md`](../versions/README.md).
