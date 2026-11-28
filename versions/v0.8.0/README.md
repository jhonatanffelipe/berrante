O menu de baixo da barra lateral pode ser recolhido. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.8.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.8.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-mac-x64.dmg) | 124 MB |
| Windows 10/11 · x64 (Intel/AMD, a maioria dos PCs) | [Berrante-0.8.0-win-x64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-win-x64.exe) | 118 MB |
| Windows 11 · ARM64 (Snapdragon, Surface Pro X…) | [Berrante-0.8.0-win-arm64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.8.0/Berrante-0.8.0-win-arm64.exe) | 113 MB |

Os `.zip` têm o mesmo app sem instalador: no Mac (`-mac-arm64.zip`, `-mac-x64.zip`) é o `.app`; no Windows
(`-win-x64.zip`, `-win-arm64.zip`), descompacte e abra o `Berrante.exe`.

**Instale certo no Mac:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

**Instale certo no Windows:** rode o `.exe` da sua arquitetura (**Configurações → Sistema → Sobre → Tipo de
sistema**). Ele instala só para o seu usuário, sem pedir administrador. O app não é assinado: na primeira vez o
SmartScreen mostra "O Windows protegeu o computador". Clique em **Mais informações → Executar assim mesmo**. Precisa
do [Git for Windows](https://git-scm.com/download/win).

### SHA-256

```
92e6080fdd8e5ac5647150031d31b2e91bb597b7febfe890dc5e4a6506bbc778  Berrante-0.8.0-mac-arm64.dmg
7fa3dd29766295c04d41e3069e46d18349da32f8d6cc21e016cffa0efea0c80e  Berrante-0.8.0-mac-x64.dmg
0e0cd5b07064a86a47420351aafbd33d71d404dc091ce9fc1dcbd1592a824abb  Berrante-0.8.0-mac-arm64.zip
6f3a598d28c98f7ae087469dd767981e5fe14b9a4bb527914b4efdb97016c1f6  Berrante-0.8.0-mac-x64.zip
ccfa7bd0aa5bfcf7df4a74a530a82dbdbd79a641b9864bc21b18183cb7527ace  Berrante-0.8.0-win-x64.exe
bb35443efe005778d28d373dc2e377a2911beda5579e6d0f9f2a9190470a6b6e  Berrante-0.8.0-win-arm64.exe
744de5eb92468f9b6b1c7232ef1f75af916b4b30f104fca097485f69d6bda458  Berrante-0.8.0-win-x64.zip
c279934ea0b06ddc3395d1d16dcc34381cfcd76e549262c848b6b1e1c4d8e6d0  Berrante-0.8.0-win-arm64.zip
```

Conferir: `shasum -a 256 <arquivo>` no Mac, ou `Get-FileHash <arquivo> -Algorithm SHA256` no PowerShell.

## Mudanças

- **Recolher o menu da barra lateral:** o botão **Menu ▾** acima de Repositórios, Contar a boiada, Curral e
  Configurações recolhe e abre esses atalhos, liberando espaço para a lista de tropas. O app lembra se ficou aberto
  ou recolhido.

## Atualizando da 0.7.0

No Mac, substitua o app em **Aplicativos** pelo da 0.8.0; no Windows, rode o instalador novo por cima. As tropas,
os workflows e as configurações são mantidos, e nada muda no formato dos dados.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
