# fazenda-web

Web de exemplo do **Fazenda** (projeto fictício usado nos testes do Berrante). React 19 + Vite + Tailwind.

## Subir

```bash
cp .env.example .env
yarn install
yarn dev   # http://localhost:8090
```

A API (`fazenda-api`) precisa estar em `VITE_API_BASE_URL` (padrão `http://localhost:3010`).

## Telas

| Rota | Tela |
|---|---|
| `/entrar` | Entrar |
| `/rebanho` | Animais e lotes |
| `/pastos` | Pastos e rodízio |
| `/vacinas` | Calendário de vacinas |

## Comandos

| Comando | Função |
|---|---|
| `yarn dev` / `yarn build` / `yarn preview` | desenvolvimento e produção |
| `yarn lint` / `yarn typecheck` / `yarn test` | qualidade |
| `yarn contracts:sync` | copia os contratos da API |
