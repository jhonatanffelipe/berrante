Troque a porta ocupada direto pela vistoria, sem caçar o `.env` na mão. Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.6.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.0/Berrante-0.6.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.6.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.6.0/Berrante-0.6.0-mac-x64.dmg) | 124 MB |

Os `.zip` (`-mac-arm64.zip`, `-mac-x64.zip`) têm o mesmo app sem o instalador `.dmg`.

**Instale certo:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**.

> **Só macOS.** Esta versão roda apenas no macOS 12 ou mais novo (Apple Silicon e Intel).

### SHA-256

```
e717048e9ec6c19ff13c416eaaf9d29684af52ced5d8e53d9379cbefe85cd8f0  Berrante-0.6.0-mac-arm64.dmg
b2070479942b4632bc786301956e0c0121979b670977d1d7a7eaebf7aecef4ce  Berrante-0.6.0-mac-x64.dmg
0c63d3d7b83f0ee35eefde2c868e56a046d332f8bd2c76248edee1044f073931  Berrante-0.6.0-mac-arm64.zip
40c47ad610736ac9d3a3d202404462e72673dab7c7538efe918bbdeeb9ceb2e0  Berrante-0.6.0-mac-x64.zip
```

Conferir: `shasum -a 256 <arquivo>`.

## Novidades

- **Mudar porta na vistoria:** em cada porta ocupada, o botão **Mudar porta** sugere a próxima porta livre, que não
  está em uso por nenhum processo da máquina nem aparece em nenhuma tropa (passos desligados, env do plano, `.env`
  e compose inclusive). Dá para digitar outra; o Berrante confere de novo antes de aceitar.
- **Mostra antes de gravar:** cada linha de `.env` que muda aparece com o antes e o depois: o `PORT` do serviço e os
  endereços de outros repos da tropa que apontam para ele (ex.: `VITE_API_URL=http://localhost:3333/api` no front).
  Senhas dentro de URLs aparecem mascaradas.
- **Compose:** se a porta vem de `${DB_PORT:-5432}` no compose, o Berrante declara `DB_PORT` no `.env` sem mexer no
  compose.
- **Quando não dá para trocar sozinho**, a vistoria explica o motivo: porta fixa no `docker-compose.yml`, porta no
  env do passo do plano (que vale mais que o `.env`) ou porta que não aparece no `.env`. Em todos os casos, o
  correto é a porta vir do `.env`.
- A vistoria passa a enxergar o `PORT` do `.env` da pasta do passo, mesmo antes de o serviço rodar pela primeira vez.

## Atualizando da 0.5.0

Substitua o app em **Aplicativos** pelo da 0.6.0. As tropas, os workflows e as configurações são mantidos, e nada
muda no formato dos dados.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
