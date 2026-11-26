# Versões do Berrante

Cada pasta guarda as notas de uma versão. Os instaladores ficam anexados ao
[GitHub Release](https://github.com/jhonatanffelipe/berrante/releases) correspondente, porque passam do limite de
100 MB por arquivo do repositório.

| Versão | Data | Plataformas | Notas |
|---|---|---|---|
| [v0.2.0](v0.2.0/README.md) | 2026-11-26 | macOS (arm64 e x64) | Workflow de subida simplificado e IA como sugestão |
| [v0.1.0](v0.1.0/README.md) | 2026-11-25 | macOS (arm64 e x64) | Primeira versão pública |

## Montar uma versão nova

```bash
# 1. Suba "version" no package.json e escreva a entrada no CHANGELOG.md
yarn test
yarn dist                       # release/<versão>/: .dmg e .zip (arm64 e x64)

# 2. Escreva versions/vX.Y.Z/README.md (downloads, tamanhos e SHA-256)
shasum -a 256 release/X.Y.Z/*.{dmg,zip}

# 3. Commit, tag e release com os instaladores anexados
git tag -a vX.Y.Z -m "Berrante vX.Y.Z"
git push origin main vX.Y.Z
gh release create vX.Y.Z --title "Berrante vX.Y.Z" --notes-file versions/vX.Y.Z/README.md \
  release/X.Y.Z/*.{dmg,zip}
```
