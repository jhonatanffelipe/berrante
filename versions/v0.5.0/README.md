Ferramentas do dia a dia: o git da tropa inteira, uma vistoria do `.env` antes de subir, perfis, healthcheck,
reinício automático e o Berrante na barra de menu. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.5.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.5.0/Berrante-0.5.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.5.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.5.0/Berrante-0.5.0-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
2e8930453f060956930b326e7d3d883d18b27704611d4faeddc9d79225ba1985  Berrante-0.5.0-mac-arm64.dmg
10dfd10e7669fa1079db32acf238916d8d75ed168bee63c235cc1ff2c32a01d8  Berrante-0.5.0-mac-x64.dmg
c6cc2418dd34a5b3a757ca0d52e93fa34628edad19250523420584433934cabf  Berrante-0.5.0-mac-arm64.zip
b22ec9051533ba1722389a0405cc982b12d3ac95aef73b9e1389e5aa8acbbce6  Berrante-0.5.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Git da tropa:** cada repositório mostra a branch, as alterações não salvas e os commits à frente/atrás do
  remoto. No menu **⋮ Mais**: **Atualizar repos (pull)** em todos de uma vez, **Buscar novidades (fetch)** e
  **Trocar de pasto**, que muda de branch em todos os repos que a têm (quem tem alteração não salva fica onde está).
- **Vistoria do pasto:** antes de tocar o berrante, e no novo botão **Conferir porteiras**, o Berrante avisa sobre
  portas ocupadas e `.env` ausente ou faltando variáveis do `.env.example`. Um botão **cria** o `.env` a partir do
  exemplo ou **completa** só as chaves que faltam, sem reescrever o que já existe.
- **Segue ao responder (health):** o passo espera uma URL local (`http://localhost:3000/health`) responder antes de
  liberar o próximo. Só endereços de `localhost` são aceitos.
- **Reinicia sozinho se cair:** opção por passo, com até 3 tentativas em 5 minutos e espera crescente.
- **Perfis da tropa:** suba só parte da tropa (ex.: "só a API"). Crie em **Plano de subida → Perfis** e escolha no
  cabeçalho da tropa.
- **Barra de menu e avisos:** toque e recolha cada tropa pelo ícone na barra de menu. Avisos do macOS quando a
  boiada sobe, um passo falha ou um serviço cai, com a janela fora de foco (desligue em **Configurações → Dia a
  dia**).
- **Log:** busca (Enter / ⇧Enter), **próximo erro** e **copiar** o log inteiro sem as cores.
- **Atalhos:** clicar numa porta abre `http://localhost:<porta>` no navegador; o botão `>_` abre o terminal
  (Terminal, iTerm, Warp ou Ghostty) na pasta do repositório.
- **Vários repositórios de uma vez:** clone vários do GitHub juntos, importe várias pastas no mesmo diálogo
  (⌘-clique) e, na tropa, filtre e marque todos.
- **Cabeçalho reorganizado:** as ações da tropa ficam em duas colunas, o **Abrir no VS Code** (`⌘O`) foi para o
  menu **⋮ Mais**, e o placar diz **processos de pé** (repositório só com passos de preparo mostra **só preparo**).

## Atualizando da 0.4.0

Substitua o app em **Aplicativos** pelo da 0.5.0. As tropas, os workflows e as configurações são mantidos: os
avisos do macOS vêm ligados, o terminal padrão é o Terminal, e as tropas existentes ficam sem perfis até você criar
um.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
