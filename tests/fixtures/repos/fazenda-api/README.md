# fazenda-api

API de exemplo do **Fazenda**, um controle de rebanho fictício usado nos testes do Berrante. Express 5 + TypeScript +
TypeORM + PostgreSQL 17.

## Subir em desenvolvimento

```bash
docker network create fazenda-network
docker compose up -d db mailpit
cp .env.example .env
yarn install
yarn migration:run && yarn seed:run && yarn seed:dev:run
yarn dev
```

- API: http://localhost:3010 · Swagger: http://localhost:3010/api-docs · métricas: http://localhost:3012/metrics
- E-mails: http://localhost:8025 (Mailpit)

Logs no Loki: suba o `fazenda-logs` e preencha `LOKI_URL=http://localhost:3101/loki/api/v1/push` no `.env`.

## Comandos

| Comando | Função |
|---|---|
| `yarn dev` | API com hot reload |
| `yarn lint` / `yarn typecheck` / `yarn test` | qualidade e testes de unidade |
| `yarn test:integration` | testes contra o Postgres |
| `yarn migration:run\|revert\|show` | migrations |
| `yarn seed:run` / `yarn seed:dev:run` | seeds obrigatórias / de exemplo |
| `yarn job:purge-versions` | limpa registros antigos |
| `yarn build` / `yarn start` | produção |

## Variáveis de ambiente

Todas em [`.env.example`](.env.example), validadas na subida.

## Escopos da API

| Prefixo | Quem |
|---|---|
| `/admin` | equipe da plataforma |
| `/conta` | usuário logado |
| `/fazenda` | fazenda ativa: animais, lotes, pastos e vacinas |
| `/health` | infraestrutura |
