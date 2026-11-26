O plano de subida do **Berrante** virou um **workflow**: passos que rodam de cima para baixo, como você faria no
terminal. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.2.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.2.0/Berrante-0.2.0-mac-arm64.dmg) | 118 MB |
| macOS · Intel | [Berrante-0.2.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.2.0/Berrante-0.2.0-mac-x64.dmg) | 122 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

O app não é assinado: o Gatekeeper do macOS pede confirmação na primeira abertura. O passo a passo está no guia.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
d204aa4a8345813a644a58cfcfede91c4537e325958780f0fa75271dafba70b1  Berrante-0.2.0-mac-arm64.dmg
c98e7353b8d7815c9f21f5e029d081dae74d477a2d630cfef8e307f5b57a2c87  Berrante-0.2.0-mac-x64.dmg
2996914a0c8fc635cd019c4ddd07e3ab46da9301b5302403e7d17f56cc8536fd  Berrante-0.2.0-mac-arm64.zip
dcdc33f1cff84d1a2f28ec6883ab5778bab67d64b117c17ada708ebd71fadf7e  Berrante-0.2.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Workflow de subida:** cada passo tem nome, pasta, comando, env e **"segue ao"** (terminar, abrir uma porta ou
  iniciar). Sem "depende de": a ordem é a da lista, e se um passo falhar os seguintes não rodam.
- **Containers mais rápidos:** um `docker compose up -d` por repositório, que segue assim que termina, em vez de
  esperar o healthcheck de cada container. Recolher a boiada roda `docker compose stop` na mesma pasta.
- **Detecção na ordem de um dev:** rede → containers → `dev` da API → workers → front-end por último.
- **IA como sugestão de workflow:** a sequência numerada com o porquê de cada passo; use como seu workflow ou
  adicione só os passos marcados.
- Seletor de pasta por passo e loading no confirmar do 2FA.

## Atualizando da 0.1.0

Substitua o app em **Aplicativos**. Os planos salvos continuam rodando; para trocar as linhas antigas de um container
por serviço pelo passo único de `docker compose up -d`, abra **Plano de subida → Detectar de novo → Salvar workflow**.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
