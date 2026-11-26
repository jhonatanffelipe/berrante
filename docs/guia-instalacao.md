# Guia de instalação do Berrante

Este guia leva do download até a primeira tropa de pé, com tudo subindo num clique. Leva uns 10 minutos.

Baixe o instalador na página da versão em
[Releases](https://github.com/jhonatanffelipe/berrante/releases/latest):

| Sistema | Processador | Arquivo |
|---|---|---|
| macOS 12 ou mais novo | Apple Silicon (M1, M2, M3, M4…) | `Berrante-0.1.0-mac-arm64.dmg` |
| macOS 12 ou mais novo | Intel | `Berrante-0.1.0-mac-x64.dmg` |
| Windows 10/11 | Intel/AMD 64 bits (a maioria dos PCs) | `Berrante-Setup-0.1.0-win-x64.exe` |
| Windows 11 | ARM (Snapdragon, Surface Pro X…) | `Berrante-Setup-0.1.0-win-arm64.exe` |
| Ubuntu, Debian, Mint, Pop!_OS | Intel/AMD 64 bits | `Berrante-0.1.0-linux-amd64.deb` |
| Ubuntu, Debian… | ARM 64 (Raspberry Pi 4/5, servidores ARM) | `Berrante-0.1.0-linux-arm64.deb` |
| Qualquer Linux | Intel/AMD 64 bits ou ARM 64 | `Berrante-0.1.0-linux-x86_64.AppImage` / `-linux-arm64.AppImage` |

> **Qual é o meu processador?**
> - **macOS:** menu  → **Sobre Este Mac**. Se aparecer "Chip Apple M…", é Apple Silicon (`arm64`); se aparecer
>   "Processador Intel", é `x64`.
> - **Windows:** **Configurações → Sistema → Sobre → Tipo de sistema**. "Processador baseado em x64" é `x64`;
>   "baseado em ARM" é `arm64`.
> - **Linux:** rode `uname -m`. `x86_64` é amd64; `aarch64` é arm64.

> **Situação por sistema nesta versão (0.1.0):** o **macOS** é o alvo principal e tem tudo funcionando. No
> **Linux** o app usa as mesmas ferramentas (`lsof`, `ps`, shell de login) e deve funcionar igual, mas ainda foi
> pouco testado. No **Windows** o app instala, abre, faz login no GitHub, clona repositórios e detecta o plano,
> mas **ainda não sobe serviços nem lista portas**.

---

## 1. Antes de instalar

O Berrante não traz Node, Yarn nem Docker: ele usa o que já está na sua máquina, do mesmo jeito que o seu
terminal. Tenha instalado o que os seus projetos usam:

- **Git** (para clonar e atualizar repositórios).
- O **gerenciador de pacotes** dos projetos: npm, Yarn, pnpm ou Bun. O Berrante lê o `packageManager` do
  `package.json` ou o lockfile para saber qual usar.
- **Docker Desktop** (ou Docker Engine no Linux), só se algum projeto tiver `docker-compose.yml`.
- Opcional: **GitHub CLI** (`gh`) já logado, para entrar sem digitar código; **Claude Code** (`claude`) ou
  **Antigravity** (`agy`), se quiser a análise do plano por IA.

O app lê o mesmo `PATH` do seu shell de login. Então, se `node`, `yarn` e `docker` funcionam no terminal,
funcionam no Berrante (inclusive versões instaladas com nvm, fnm, asdf ou Homebrew).

## 2. Instalar

### macOS

1. Abra o `.dmg` e arraste o **Berrante** para **Aplicativos**.
2. O app não é assinado pela Apple, então na primeira vez o macOS bloqueia a abertura. Vá em
   **Ajustes do Sistema → Privacidade e Segurança**, role até o aviso do Berrante e clique em
   **Abrir Mesmo Assim**.
3. Se aparecer "o Berrante está danificado e não pode ser aberto", rode no Terminal e abra de novo:

   ```bash
   xattr -cr /Applications/Berrante.app
   ```

### Windows

1. Rode o `Berrante-Setup-0.1.0-win-x64.exe` (ou o `-arm64`).
2. Como o instalador não é assinado, o Windows pode mostrar "O Windows protegeu o computador". Clique em
   **Mais informações → Executar assim mesmo**.
3. O instalador é um assistente com as opções de sempre:
   - **Para quem instalar:** *Somente para mim* (não pede administrador, instala em
     `%LOCALAPPDATA%\Programs\Berrante`) ou *Para todos os usuários* (pede administrador e instala em
     `C:\Program Files\Berrante`).
   - **Pasta de instalação:** dá para trocar pelo botão **Procurar…**.
   - Cria os atalhos na **Área de Trabalho** e no **Menu Iniciar**.
4. Para desinstalar: **Configurações → Aplicativos → Aplicativos instalados → Berrante → Desinstalar**. Os seus
   dados (tropas e configurações) ficam em `%APPDATA%\Berrante` e não são apagados.

### Linux

**`.deb` (Ubuntu, Debian e derivados):**

```bash
sudo apt install ./Berrante-0.1.0-linux-amd64.deb
```

O Berrante aparece no menu de aplicativos. Para remover: `sudo apt remove berrante`.

**AppImage (qualquer distribuição):**

```bash
chmod +x Berrante-0.1.0-linux-x86_64.AppImage
./Berrante-0.1.0-linux-x86_64.AppImage
```

Se reclamar de FUSE, instale `libfuse2` (Ubuntu 22.04+: `sudo apt install libfuse2t64` ou `libfuse2`).

O cofre de segredos usa o chaveiro do sistema (GNOME Keyring ou KWallet). Num desktop comum ele já está ativo.

## 3. Entrar no GitHub (opcional)

O login só é necessário para **listar e clonar** repositórios do GitHub. Projetos que já estão na sua máquina
podem ser importados sem login.

Em **Repositórios → No GitHub**:

- **Importar sessão do gh:** se o GitHub CLI já está logado (`gh auth status`), um clique e pronto.
- **Entrar (Device Flow):** mostra um código de 8 letras e abre `github.com/login/device`. Cole o código,
  autorize e volte para o app.

O token fica guardado cifrado pelo sistema (Keychain no macOS, DPAPI no Windows, chaveiro no Linux) e nunca é
gravado em texto puro.

## 4. Trazer os repositórios

Ainda em **Repositórios**:

- **No GitHub → Clonar:** escolha o repositório na lista. Ele vai para a pasta de clones (por padrão `~/www`; dá
  para trocar em **Configurações → Pasta raiz dos clones**).
- **Na máquina → Importar pasta local:** escolha uma pasta que já existe.
- **Pull:** atualiza um repositório já clonado; **Finder** abre a pasta.

## 5. Montar a primeira tropa

1. Na barra lateral, clique em **+** ao lado de **Tropas** (ou `⌘N` / `Ctrl+N`).
2. Dê um nome, escolha a cor e a peça, e marque os repositórios que sobem juntos (por exemplo: backend, web
   e logs).
3. Abra a aba **Plano de subida**. Na primeira vez a detecção roda sozinha (depois, use **Detectar de novo**). O
   Berrante lê cada repositório e monta a ordem:
   - containers do `docker-compose.yml` (perfis opcionais ficam desligados);
   - etapas de preparo, como `yarn install` e `docker network create` encontrados no README;
   - scripts longos, como `dev` e `start:dev`, que viram serviços;
   - scripts curtos, como `lint`, `test` e `build`, que viram **ações** para rodar quando quiser;
   - um aviso quando falta chave do `.env.example` no `.env`.
4. Revise o plano: ligue, desligue, reordene e edite comandos. Re-detectar depois preserva o que você editou.
5. Clique em **Salvar plano**.

## 6. Tocar o berrante

Na tropa, clique em **Tocar o berrante** (`⌘↩` / `Ctrl+Enter`). Tudo sobe na ordem do plano; o placar mostra
quantos serviços estão de pé e cada linha mostra estado, tempo rodando e portas. O botão **≡** de cada serviço
abre o log ao vivo, e as **ações** (`build`, `lint`, `test`…) rodam com um clique, cada uma com o próprio log.

- **Recolher a boiada** (`⇧⌘↩`) para tudo: `SIGTERM` no grupo de processos, `SIGKILL` se não sair, e
  `docker compose stop` nos containers.
- Se uma porta do plano já estiver ocupada, o Berrante avisa antes de subir e mostra quem está usando.
- Ao fechar o app com serviços rodando, ele pergunta: **Recolher a boiada** ou **Manter rodando**. Mantendo, os
  processos continuam e o Berrante os reconhece na próxima abertura.

## 7. Contar a boiada (portas e processos)

A aba **Contar a boiada** lista todas as portas TCP abertas na máquina, com PID, comando e de qual tropa é,
atualizando a cada 2 segundos. Dá para encerrar um processo por ali. Encerrar um processo que **não** é do
Berrante exige o código do 2FA, se ele estiver ativo.

## 8. Segurança (opcional, recomendado)

Em **Configurações → Segurança**, ative o **2FA** com qualquer app autenticador (Google Authenticator, 1Password,
Authy…): leia o QR, digite o código e guarde os 10 **códigos de recuperação** (o botão **Copiar** copia todos).
Com o 2FA ativo, o código é pedido para habilitar e usar a análise por IA e para encerrar processos de fora.

## 9. Aparência

Em **Configurações → Aparência**, escolha a **cor de destaque** (Azul, Verde-limão, Verde, Ciano, Laranja, Rosa,
Roxo, Vermelho ou Âmbar). Com **Tingir o fundo** ligado, o fundo puxa o tom da cor escolhida; desligado, fica em
preto e cinza. Em **Temas prontos**, o **Drácula** aplica a paleta oficial inteira (fundo, texto e cores de status).

## 10. Atualizar para uma versão nova

Baixe o instalador novo e instale por cima (no macOS, substitua o app em **Aplicativos**). As tropas, os
repositórios e as configurações são mantidos.

---

## Onde ficam os dados

| Sistema | Pasta |
|---|---|
| macOS | `~/Library/Application Support/Berrante/` |
| Windows | `%APPDATA%\Berrante\` |
| Linux | `~/.config/Berrante/` |

Lá ficam `projects.json`, `repositories.json`, `settings.json`, o cofre cifrado `secrets.bin` e os logs em
`logs/` (o menu **Ajuda → Abrir pasta de dados** abre essa pasta).

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| macOS: "não pode ser aberto porque é de um desenvolvedor não identificado" | Passo 2 (Abrir Mesmo Assim). |
| macOS: "está danificado" | `xattr -cr /Applications/Berrante.app`. |
| Windows: "O Windows protegeu o computador" | **Mais informações → Executar assim mesmo**. |
| Serviço falha com `command not found` (`yarn`, `node`, `docker`) | Confirme que o comando funciona num terminal novo. O Berrante usa o `PATH` do shell de login. |
| Containers não sobem | Abra o Docker Desktop e espere ficar "running". |
| "Porta ocupada no pasto" ao tocar o berrante | Veja quem usa a porta em **Contar a boiada** e encerre, ou suba mesmo assim. |
| "Entrar (Device Flow)" desabilitado | Use **Importar sessão do gh**, ou importe as pastas sem login. |
| Linux: AppImage não abre | Instale `libfuse2` (passo 2). |
