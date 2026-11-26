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
> serviços nem lista portas**.

### SHA-256

```
f5d578eaeb776771eef2fd961e58868435c3167ba9205dabc02676442f7d4b11  Berrante-0.1.0-mac-arm64.dmg
29f5b37629341043719e9dbf92255390e154af323211d8c52442886991ba0dda  Berrante-0.1.0-mac-x64.dmg
70432ef41e30489dbac347f7dad45b66f83d4226a78b91d50d8f898074704fbc  Berrante-0.1.0-mac-arm64.zip
c6c1d73fbbb17fb6edf6f4efe42afd0aa30eb2fcdb9d9b4ba431a457936830a0  Berrante-0.1.0-mac-x64.zip
ca65dc46bc8b7d559afe3b52c73f8fb3e23c86e2ea482d4707708e873ae96758  Berrante-Setup-0.1.0-win-x64.exe
2ea5b53518f184ffdc2c337e2ee06419dbf207a9ba5b8fa4f865fd04b617c3cb  Berrante-Setup-0.1.0-win-arm64.exe
8807a93ee1e5175093ff80e3b5b3de71ea77c6be5e2fc9001da1243720514b27  Berrante-0.1.0-linux-amd64.deb
41e101e4d0f9f1cf5a7cb4f77b78dbe6fb17450e7904e368df0c59a2515ae8f7  Berrante-0.1.0-linux-arm64.deb
d0589d503af48bd66a2757bdd589888cc03ca0d135fd72cb9bd55a35e7754734  Berrante-0.1.0-linux-x86_64.AppImage
68721a80e6faee6e42910bb820e121f5d62de40f2a0c1cf31d81faabf7a7a0ee  Berrante-0.1.0-linux-arm64.AppImage
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
