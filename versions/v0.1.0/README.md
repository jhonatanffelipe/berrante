Primeira versão do **Berrante**: junte os repositórios de um projeto numa tropa e suba containers, preparos e
scripts na ordem certa, com um clique. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.1.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-mac-arm64.dmg) | 118 MB |
| macOS · Intel | [Berrante-0.1.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.1.0/Berrante-0.1.0-mac-x64.dmg) | 122 MB |

Os `.zip` do macOS (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

O app não é assinado: o Gatekeeper do macOS pede confirmação na primeira abertura. O passo a passo está no guia.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
f5d578eaeb776771eef2fd961e58868435c3167ba9205dabc02676442f7d4b11  Berrante-0.1.0-mac-arm64.dmg
29f5b37629341043719e9dbf92255390e154af323211d8c52442886991ba0dda  Berrante-0.1.0-mac-x64.dmg
70432ef41e30489dbac347f7dad45b66f83d4226a78b91d50d8f898074704fbc  Berrante-0.1.0-mac-arm64.zip
c6c1d73fbbb17fb6edf6f4efe42afd0aa30eb2fcdb9d9b4ba431a457936830a0  Berrante-0.1.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Tropas** com N repositórios e **plano de subida detectado** (lockfile, `docker compose`, scripts, README e
  `.env.example`), editável e preservado ao re-detectar.
- **Tocar o berrante / Recolher a boiada**, com logs ao vivo, portas, tempo rodando e processos que sobrevivem ao
  fechar o app (se você quiser).
- **Contar a boiada:** portas e PIDs da máquina, com dono por tropa.
- **GitHub** (Device Flow ou `gh`), clone e pull; **IA opcional** somente leitura; **2FA** com códigos de
  recuperação.
- Visual de **painel de telemetria** com 9 cores de destaque e o tema **Drácula**; menu nativo e atalhos.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
