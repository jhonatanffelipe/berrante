Primeira versão do **Berrante**: junte os repositórios de um projeto numa tropa e suba containers, preparos e
scripts na ordem certa, com um clique. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/v0.1.0/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.1.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-mac-arm64.dmg) | 118 MB |
| macOS · Intel | [Berrante-0.1.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-mac-x64.dmg) | 122 MB |
| Windows 10/11 · x64 | [Berrante-Setup-0.1.0-win-x64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-Setup-0.1.0-win-x64.exe) | 118 MB |
| Windows 11 · ARM | [Berrante-Setup-0.1.0-win-arm64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-Setup-0.1.0-win-arm64.exe) | 112 MB |
| Linux · Debian/Ubuntu x64 | [Berrante-0.1.0-linux-amd64.deb](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-linux-amd64.deb) | 99 MB |
| Linux · Debian/Ubuntu ARM64 | [Berrante-0.1.0-linux-arm64.deb](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-linux-arm64.deb) | 94 MB |
| Linux · AppImage x64 | [Berrante-0.1.0-linux-x86_64.AppImage](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-linux-x86_64.AppImage) | 122 MB |
| Linux · AppImage ARM64 | [Berrante-0.1.0-linux-arm64.AppImage](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-linux-arm64.AppImage) | 124 MB |

Os `.zip` do macOS (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

O instalador do Windows é um assistente: escolha entre **só para mim** ou **todos os usuários** (em `Arquivos de
Programas`) e a pasta de instalação. Ele cria atalhos e registra o app em **Configurações → Aplicativos**.

Os apps não são assinados: o Gatekeeper do macOS e o SmartScreen do Windows pedem confirmação na primeira abertura.
O passo a passo está no guia.

> **Situação por sistema:** o **macOS** é o alvo principal e tem tudo funcionando. O **Linux** deve funcionar igual,
> mas foi pouco testado. No **Windows** o app instala, abre, faz login, clona e detecta o plano, mas ainda **não sobe
> serviços nem lista portas** (vem com o suporte à WSL).

### SHA-256

```
061adce2543d6a755d360006d881809d1cb56a2c6bcda03140faab74a1ae5126  Berrante-0.1.0-mac-arm64.dmg
9e656861b4514fb8583103c0f087aeb4bc5cf49fba71726d3bf08db5aac1728d  Berrante-0.1.0-mac-x64.dmg
fe7bbbef0517d90509db39d948bc848f4d5988baa7ce505a8308c94f839a1b91  Berrante-0.1.0-mac-arm64.zip
6ab5b9bc72b2296fbe9cdc87ad1b8a7f03b0100a8898e65fb6d33ffe8a401ebf  Berrante-0.1.0-mac-x64.zip
860c9e1f7b9c8c79d670c131b0441e7b307e5157b7fdf0e02460c01039054c4a  Berrante-Setup-0.1.0-win-x64.exe
867b8c88861c32c77a261036db1020f16989db6126a9a85d592cba58f98d77c9  Berrante-Setup-0.1.0-win-arm64.exe
27d17b352764bd3d03981d9a1c15be58caad4ce6e5afa4af6f114837e3116aa0  Berrante-0.1.0-linux-amd64.deb
b68b632661dcbf94ff542a3d9b9c45a5e6dad4b3bade85cd2c4be6e8797e76a3  Berrante-0.1.0-linux-arm64.deb
fb68c310a8d6f193f7f26e5e0700ff295fc8d990e3f434e7389d9ab537594398  Berrante-0.1.0-linux-x86_64.AppImage
bad85af4935265313043d7e2b03c7166c3fe3736d384058d037f0140de17196c  Berrante-0.1.0-linux-arm64.AppImage
```

Conferir: `shasum -a 256 <arquivo>` (macOS/Linux) ou `certutil -hashfile <arquivo> SHA256` (Windows).

## Novidades

- **Tropas** com N repositórios e **plano de subida detectado** (lockfile, `docker compose`, scripts, README e
  `.env.example`), editável e preservado ao re-detectar.
- **Tocar o berrante / Recolher a boiada**, com logs ao vivo, portas, tempo rodando e processos que sobrevivem ao
  fechar o app (se você quiser).
- **Contar a boiada:** portas e PIDs da máquina, com dono por tropa.
- **GitHub** (Device Flow ou `gh`), clone e pull; **IA opcional** somente leitura; **2FA** com códigos de
  recuperação.
- Visual de **painel de telemetria** com 9 cores de destaque e o tema **Drácula**; menu nativo e atalhos.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/v0.1.0/CHANGELOG.md).
