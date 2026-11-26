Correções de instalação no macOS: acabou o **"Berrante está danificado e não pode ser aberto"**. Primeira
instalação? Siga o [guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.2.1-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.2.1/Berrante-0.2.1-mac-arm64.dmg) | 116 MB |
| macOS · Intel | [Berrante-0.2.1-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.2.1/Berrante-0.2.1-mac-x64.dmg) | 123 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
382f16cfaa2e74090c5cb8261ee8318ef240120daabb6ee3a1f020eff9d83d84  Berrante-0.2.1-mac-arm64.dmg
04716a21275a4e045478c52e0008b9fd492d360c0cc1ed4dcf7a1cf3933f198e  Berrante-0.2.1-mac-x64.dmg
a38dda24aed3c92c10ca084732c61453fdc059aa56a4f59ec1d7bd88887adf17  Berrante-0.2.1-mac-arm64.zip
880a701d2249556ae79eb325d8af393b9ff3698d1f358472906b7485193e1b1b  Berrante-0.2.1-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Correções

- **"Está danificado":** os instaladores até a 0.2.0 saíam com a assinatura `linker-signed` do Electron, que quebra
  quando o app é renomeado. Baixado pelo navegador, o macOS recusava abrir. Agora o app é assinado ad-hoc e selado
  por inteiro.
- **Lentidão ao abrir fora de Aplicativos:** o Berrante avisa quando está rodando pelo Rosetta (versão Intel num Mac
  Apple Silicon) e oferece **Mover para Aplicativos** quando é aberto de dentro do `.dmg` ou de Downloads.

## Atualizando da 0.2.0

Substitua o app em **Aplicativos** pelo da 0.2.1. As tropas, os workflows e as configurações são mantidos.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
