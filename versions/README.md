# Versões do Berrante

Cada pasta guarda as notas de uma versão. Os instaladores ficam anexados ao
[GitHub Release](https://github.com/jhonatanffelipe/berrante/releases) correspondente, porque passam do limite de
100 MB por arquivo do repositório.

| Versão | Data | Plataformas | Notas |
|---|---|---|---|
| [v0.8.0](v0.8.0/README.md) | 2026-11-27 | macOS (arm64 e x64) e Windows (x64 e arm64) | Menu de baixo da barra lateral recolhível |
| [v0.7.0](v0.7.0/README.md) | 2026-11-26 | macOS (arm64 e x64) e Windows (x64 e arm64) | Suporte a Windows: Git Bash, netstat, taskkill, bandeja e atalhos `Ctrl` |
| [v0.6.2](v0.6.2/README.md) | 2026-11-26 | macOS (arm64 e x64) | Serviço fora do play sem apagado, com indicador próprio |
| [v0.6.1](v0.6.1/README.md) | 2026-11-26 | macOS (arm64 e x64) | Vistoria acusa cada porta só no passo que a usa |
| [v0.6.0](v0.6.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Mudar a porta ocupada pela vistoria, direto no `.env` |
| [v0.5.0](v0.5.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Git da tropa, vistoria do `.env`, perfis, healthcheck, barra de menu e avisos |
| [v0.4.0](v0.4.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Workspace do VS Code por tropa, aberto com um clique ou `⌘O` |
| [v0.3.0](v0.3.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Curral e aba Containers: parar, subir e reiniciar containers |
| [v0.2.1](v0.2.1/README.md) | 2026-11-26 | macOS (arm64 e x64) | Assinatura ad-hoc (sem "danificado") e avisos de instalação |
| [v0.2.0](v0.2.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Workflow de subida simplificado e IA como sugestão |
| [v0.1.0](v0.1.0/README.md) | 2026-11-25 | macOS (arm64 e x64) | Primeira versão pública |

## Montar uma versão nova

Cada sistema empacota o seu: os `.dmg` saem de um Mac (`yarn dist`) e os `.exe` de um Windows (`yarn dist:win`).
Quem publica a release anexa os instaladores do próprio sistema; o outro entra depois com `gh release upload`.

```bash
# 1. Suba "version" no package.json e escreva a entrada no CHANGELOG.md
yarn test
yarn dist                       # no Mac: release/<versão>/ com .dmg e .zip (arm64 e x64)
yarn dist:win                   # no Windows: release/<versão>/ com .exe e .zip (x64 e arm64)

# 2. Escreva versions/vX.Y.Z/README.md (downloads, tamanhos e SHA-256)
shasum -a 256 release/X.Y.Z/*.{dmg,zip}     # no Mac
sha256sum release/X.Y.Z/*.{exe,zip}         # no Windows (Git Bash)

# 3. Commit, tag e release com os instaladores anexados
git tag -a vX.Y.Z -m "Berrante vX.Y.Z"
git push origin main vX.Y.Z
gh release create vX.Y.Z --title "Berrante vX.Y.Z" --notes-file versions/vX.Y.Z/README.md \
  release/X.Y.Z/*.{dmg,zip}

# 4. Os instaladores do outro sistema entram na mesma release depois
#    (e as notas ganham as linhas e os SHA-256 deles: gh release edit vX.Y.Z --notes-file …)
gh release upload vX.Y.Z release/X.Y.Z/*.{exe,zip}    # ou *.{dmg,zip}, a partir do Mac
```
