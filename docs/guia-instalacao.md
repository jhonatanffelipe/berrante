# Guia de instalação do Berrante

Este guia leva do download até a primeira tropa de pé, com tudo subindo num clique. Leva uns 10 minutos.

Baixe o instalador na página da versão em
[Releases](https://github.com/jhonatanffelipe/berrante/releases/latest):

| Sistema | Processador | Arquivo |
|---|---|---|
| macOS 12 ou mais novo | Apple Silicon (M1, M2, M3, M4…) | `Berrante-0.6.1-mac-arm64.dmg` |
| macOS 12 ou mais novo | Intel | `Berrante-0.6.1-mac-x64.dmg` |

> **Qual é o meu processador?** Menu  → **Sobre Este Mac**. Se aparecer "Chip Apple M…", é Apple Silicon
> (`arm64`); se aparecer "Processador Intel", é `x64`. A versão Intel num Mac Apple Silicon roda pelo Rosetta e
> fica bem mais lenta (o Berrante avisa se isso acontecer).

> **Só macOS, por enquanto.** As primeiras versões do Berrante rodam apenas no macOS. Windows e Linux não são
> suportados.

---

## 1. Antes de instalar

O Berrante não traz Node, Yarn nem Docker: ele usa o que já está na sua máquina, do mesmo jeito que o seu
terminal. Tenha instalado o que os seus projetos usam:

- **Git** (para clonar e atualizar repositórios).
- O **gerenciador de pacotes** dos projetos: npm, Yarn, pnpm ou Bun. O Berrante lê o `packageManager` do
  `package.json` ou o lockfile para saber qual usar.
- **Docker Desktop** (ou OrbStack/Colima), só se algum projeto tiver `docker-compose.yml`.
- Opcional: **GitHub CLI** (`gh`) já logado, para entrar sem digitar código; **Claude Code** (`claude`) ou
  **Antigravity** (`agy`), se quiser a análise do plano por IA.

O app lê o mesmo `PATH` do seu shell de login. Então, se `node`, `yarn` e `docker` funcionam no terminal,
funcionam no Berrante (inclusive versões instaladas com nvm, fnm, asdf ou Homebrew).

## 2. Instalar

1. Abra o `.dmg` e **arraste o Berrante para Aplicativos**. Não abra o app de dentro do `.dmg`: lido da imagem
   compactada ele fica lento (se você fizer isso, o Berrante oferece se mover para Aplicativos).
2. Ejete o volume do `.dmg` e abra o Berrante pela pasta **Aplicativos** ou pelo Launchpad.
3. O app não é notarizado pela Apple, então na primeira vez o macOS bloqueia a abertura. Vá em
   **Ajustes do Sistema → Privacidade e Segurança**, role até o aviso do Berrante e clique em
   **Abrir Mesmo Assim**.
4. Se pedir acesso ao **Chaveiro** ("Berrante Safe Storage"), clique em **Sempre permitir**: é onde ficam, cifrados,
   o token do GitHub e o 2FA. Como o app não é assinado por uma conta de desenvolvedor, o macOS pergunta de novo a
   cada versão nova.

> **Plano B:** se mesmo assim aparecer "o Berrante está danificado e não pode ser aberto" (versões até a 0.2.0
> tinham a assinatura quebrada), rode no Terminal e abra de novo:
>
> ```bash
> xattr -cr /Applications/Berrante.app
> ```

## 3. Entrar no GitHub (opcional)

O login só é necessário para **listar e clonar** repositórios do GitHub. Projetos que já estão na sua máquina
podem ser importados sem login.

Em **Repositórios → No GitHub**:

- **Importar sessão do gh:** se o GitHub CLI já está logado (`gh auth status`), um clique e pronto.
- **Entrar (Device Flow):** mostra um código de 8 letras e abre `github.com/login/device`. Cole o código,
  autorize e volte para o app.

O token fica guardado cifrado pelo sistema (Keychain do macOS) e nunca é
gravado em texto puro.

## 4. Trazer os repositórios

Ainda em **Repositórios**:

- **No GitHub → Clonar:** escolha o repositório na lista. Ele vai para a pasta de clones (por padrão `~/www`; dá
  para trocar em **Configurações → Pasta raiz dos clones**).
- **Na máquina → Importar pasta local:** escolha uma pasta que já existe.
- **Pull:** atualiza um repositório já clonado; **Finder** abre a pasta.

## 5. Montar a primeira tropa

1. Na barra lateral, clique em **+** ao lado de **Tropas** (ou `⌘N`).
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

Na tropa, clique em **Tocar o berrante** (`⌘↩`). Tudo sobe na ordem do plano; o placar mostra
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

Baixe o `.dmg` novo e substitua o app em **Aplicativos**. As tropas, os
repositórios e as configurações são mantidos.

---

## Onde ficam os dados

Em `~/Library/Application Support/Berrante/` ficam `projects.json`, `repositories.json`, `settings.json`, o cofre cifrado `secrets.bin` e os logs em
`logs/` (o menu **Ajuda → Abrir pasta de dados** abre essa pasta).

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "Não pode ser aberto porque é de um desenvolvedor não identificado" | Passo 2 (Abrir Mesmo Assim). |
| "Está danificado" | `xattr -cr /Applications/Berrante.app` (plano B do passo 2). |
| App lento, clique e digitação demorando | Confira se abriu o de **Aplicativos** (não o de dentro do `.dmg`) e o instalador certo para o seu processador (`arm64` para Apple Silicon). |
| Serviço falha com `command not found` (`yarn`, `node`, `docker`) | Confirme que o comando funciona num terminal novo. O Berrante usa o `PATH` do shell de login. |
| Containers não sobem | Abra o Docker Desktop e espere ficar "running". |
| "Porta ocupada no pasto" ao tocar o berrante | Veja quem usa a porta em **Contar a boiada** e encerre, ou suba mesmo assim. |
| "Entrar (Device Flow)" desabilitado | Use **Importar sessão do gh**, ou importe as pastas sem login. |
