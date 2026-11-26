Controle dos containers Docker de dentro do Berrante: o novo **Curral** mostra todos os containers da máquina, e a
aba **Containers** da tropa mostra os que o workflow sobe, com parar, subir e reiniciar. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.3.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.3.0/Berrante-0.3.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.3.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.3.0/Berrante-0.3.0-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
b9964f61a0bc4f7264ee6183db741496b2d6d08d6c100effa5c3ee763c4443f1  Berrante-0.3.0-mac-arm64.dmg
7720bce7ebd13290916377439a95d5e3833b3445770ea20d104f82abdb4d62c2  Berrante-0.3.0-mac-x64.dmg
ce7c3d2e5711aa4e7bdd464486b3b1a62e4f3f7e49ba031c10e62153f65bfaaa  Berrante-0.3.0-mac-arm64.zip
2d5432c5490570902fcab3408ea80c09f5e41f3675407881e4c8a6a9b0c2edb8  Berrante-0.3.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Curral** (`⇧⌘D`): todos os containers Docker da máquina, atualizados a cada 3 segundos, com estado, health,
  portas publicadas, projeto e serviço do compose e a **tropa dona** (quando o compose fica num repo dela). Pare,
  suba ou reinicie cada um. Filtros: de pé, todos, de tropas e de fora.
- **Aba Containers na tropa** (`⌥⌘3`): cada passo `docker compose … up` do workflow vira um bloco com os serviços
  que ele sobe, inclusive os ainda não criados. Suba, pare ou reinicie um serviço só ou a stack inteira, sem tocar
  o berrante. Pasta e argumentos do compose (`-f`, `-p`) vêm do plano salvo.

## Atualizando da 0.2.1

Substitua o app em **Aplicativos** pelo da 0.3.0. As tropas, os workflows e as configurações são mantidos.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
