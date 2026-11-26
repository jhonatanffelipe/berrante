Correção da vistoria do pasto: cada porta ocupada aparece só no passo que a usa. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.6.1-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.1/Berrante-0.6.1-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.6.1-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.1/Berrante-0.6.1-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
3c3a89b216a3ae777e3fa5a8a548145d48e93a2bd7183adbfc2a8ca10033ae2d  Berrante-0.6.1-mac-arm64.dmg
6ad82809574a438f564286eb997bea5a2752bad3fb5d51bdee7772ecbdb5a94a  Berrante-0.6.1-mac-x64.dmg
802643b0a9759a360766989a00f8478b0b276b2ae50eca7d5b95e23f172820c6  Berrante-0.6.1-mac-arm64.zip
8b47f385c733b14b302d0b40f61150967423a50c5357c3a91d5ca3036a388681  Berrante-0.6.1-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Correções

- **Vistoria acusava a mesma porta em vários passos:** na 0.6.0, o `PORT` do `.env` passou a valer para todo passo
  da pasta, então uma porta ocupada aparecia também no `docker compose up -d` e nos workers, que não a usam. Agora
  ele só conta para o passo que abre a porta (segue ao abrir uma porta ou ao responder).
- Os comandos mostrados na vistoria trocam a pasta do usuário por `~`.

## Atualizando da 0.6.0

Substitua o app em **Aplicativos** pelo da 0.6.1. As tropas, os workflows e as configurações são mantidos, e nada
muda no formato dos dados.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
