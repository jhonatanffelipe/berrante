Serviço fora do play deixa de aparecer apagado no painel. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.6.2-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.2/Berrante-0.6.2-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.6.2-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.2/Berrante-0.6.2-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
49dba6495f151f58f26cd07568e7cfde11632278a5a6edf998aaad7c333b86ff  Berrante-0.6.2-mac-arm64.dmg
1e65e55f7dee8a21c8959db330510430805bd2e711f216bf21cee144101acc54  Berrante-0.6.2-mac-x64.dmg
a9c09c31afc6a8752c641b23e60401421df06cbd61d359c9e35456e9bccd7c2e  Berrante-0.6.2-mac-arm64.zip
882db27efd02dcc2869282cfa94475fa481d057f82906b43753c10750ecb719f  Berrante-0.6.2-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Mudanças

- **Serviço fora do play:** a linha não fica mais esmaecida, então o ▶, o log e a porta continuam legíveis. No
  lugar do número aparece `··` (passe o mouse para a dica), a etiqueta **fora do play** fica laranja e a numeração
  conta só os passos que sobem com o play, na ordem da subida. Bom para scripts de outro repositório da tropa que
  você roda de vez em quando, sem subir junto com o projeto.

## Atualizando da 0.6.1

Substitua o app em **Aplicativos** pelo da 0.6.2. As tropas, os workflows e as configurações são mantidos, e nada
muda no formato dos dados.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
