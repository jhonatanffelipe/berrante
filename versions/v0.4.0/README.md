Abra o código da tropa no VS Code com um clique: escolha o `.code-workspace` em **Editar tropa** e use o botão
**VS Code** no cabeçalho (ou `⌘O`). Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.4.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.4.0/Berrante-0.4.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.4.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.4.0/Berrante-0.4.0-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
efb034a5e61fd8e586c4d0cbc4768e9384d752f1bf1a62646b2f202e0568ee18  Berrante-0.4.0-mac-arm64.dmg
8261def400fc78f852286e2fe5bf2ee3cba17dca1d99495069d8b91d69d86795  Berrante-0.4.0-mac-x64.dmg
f1482bbb01cbab5cb937d3250522ae670a8bc6d27941c40696ba74390619bec4  Berrante-0.4.0-mac-arm64.zip
3783c149dedb86c68eae8904b7cc2a739de007f5618835259ed857dae2cd973d  Berrante-0.4.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Workspace do VS Code na tropa:** em **Editar tropa**, o campo **Workspace do VS Code** abre o seletor só com
  arquivos `.code-workspace`; o **✕** tira o workspace. Com um configurado, o cabeçalho da tropa ganha o botão
  **VS Code**, e o menu Tropa ganha **Abrir no VS Code** (`⌘O`). Sem workspace, o `⌘O` abre o Editar tropa.
- Abre pelo app do VS Code, sem precisar do comando `code` no PATH. O arquivo é conferido ao salvar e ao abrir, e o
  caminho vem sempre da tropa salva.

## Atualizando da 0.3.0

Substitua o app em **Aplicativos** pelo da 0.4.0. As tropas, os workflows e as configurações são mantidos; as
tropas existentes ficam sem workspace até você escolher um.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
