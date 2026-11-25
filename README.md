# Berrante

> Um toque e a boiada vem junto.

App desktop (Electron) para gerenciar e subir projetos locais. Uma **tropa** junta N repositórios (ex: backend + web + logs).
Ao **tocar o berrante**, os containers do docker compose, as etapas de preparo e os scripts de dev sobem na ordem certa.
O app roda só na sua máquina, com macOS (arm64) como alvo principal.

| Na UI | Termo técnico |
|---|---|
| Tocar o berrante | start all |
| Recolher a boiada | stop all (SIGTERM → SIGKILL no process group + `docker compose stop`) |
| Contar a boiada | portas TCP em LISTEN / PIDs (`lsof` + `ps`) |
| Tropa | projeto |

## Setup

Requisitos: Node 24 (`.nvmrc`), Yarn 1.22 e Docker Desktop (opcional, só para compose). O `gh` CLI também é
opcional e serve de atalho de login.

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
| `yarn test` | vitest: detector de startup, parser do README, parser do lsof e contrato IPC |
| `yarn build` | typecheck + bundle em `out/` |
| `yarn dist` | build + `.dmg` e `.zip` arm64 em `release/<versão>/` |
| `yarn dist:dir` | build + `.app` sem empacotar (mais rápido para testar) |
| `yarn icon` | regenera `build/icon.png` (berrante em pixel art, procedural) |

O build local sai **sem assinatura**. Na primeira abertura, use o botão direito → Abrir, ou rode
`xattr -dr com.apple.quarantine /Applications/Berrante.app`.

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
│  └─ container.ts  composition root (DI manual)
├─ preload/         contextBridge → window.berrante (invoke em canais da allowlist + eventos)
└─ renderer/        React 18 + Tailwind (tokens Dracula em CSS vars) + Radix
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

Em `~/Library/Application Support/Berrante/`: `projects.json`, `repositories.json`, `settings.json`,
`runtime-state.json`, `secrets.bin` (cifrado), `logs/berrante.log` (JSON lines) e `logs/services/*.log`.

## Testes

`yarn test` roda sobre fixtures em `tests/fixtures/repos`: README, `package.json` e compose de um projeto fictício
(`fazenda-api`, `fazenda-web` e `fazenda-logs`), com `.env.example` só com chaves.

## Roadmap multiplataforma

O foco atual é o macOS. Tudo que toca o SO passa por ports (`CommandRunner`, `PortScannerGateway`,
`ProcessManagerGateway`, `ProcessKiller`, `ShellEnv`), então outras plataformas são novos adapters no
`container.ts`, sem mexer em use case:

- **Linux (.deb)**: o alvo `deb` já está no `electron-builder.yml`. Funciona com o mesmo lsof/ps (ou um adapter
  `ss -ltnp`); o `safeStorage` usa libsecret.
- **Windows enxergando a WSL**: um `WslCommandRunner` executa `wsl.exe -d <distro> -- bash -lc …`. Processos,
  portas (`lsof` dentro da distro) e docker rodam na WSL, e os caminhos são traduzidos (`\\wsl$\<distro>\…` ↔ `/home/…`).
