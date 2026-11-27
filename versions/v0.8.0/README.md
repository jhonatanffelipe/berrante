O menu de baixo da barra lateral pode ser recolhido. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.8.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.8.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Windows:** os instaladores da 0.8.0 entram nesta página depois. Até lá, use os da
> [0.7.0](https://github.com/jhonatanffelipe/berrante/releases/tag/v0.7.0).

### SHA-256

```
92e6080fdd8e5ac5647150031d31b2e91bb597b7febfe890dc5e4a6506bbc778  Berrante-0.8.0-mac-arm64.dmg
7fa3dd29766295c04d41e3069e46d18349da32f8d6cc21e016cffa0efea0c80e  Berrante-0.8.0-mac-x64.dmg
0e0cd5b07064a86a47420351aafbd33d71d404dc091ce9fc1dcbd1592a824abb  Berrante-0.8.0-mac-arm64.zip
6f3a598d28c98f7ae087469dd767981e5fe14b9a4bb527914b4efdb97016c1f6  Berrante-0.8.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Mudanças

- **Recolher o menu da barra lateral:** o botão **Menu ▾** acima de Repositórios, Contar a boiada, Curral e
  Configurações recolhe e abre esses atalhos, liberando espaço para a lista de tropas. O app lembra se ficou aberto
  ou recolhido.

## Atualizando da 0.7.0

Substitua o app em **Aplicativos** pelo da 0.8.0. As tropas, os workflows e as configurações são mantidos, e nada
muda no formato dos dados.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
