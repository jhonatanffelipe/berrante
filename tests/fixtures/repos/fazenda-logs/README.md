# fazenda-logs

Stack de observabilidade do **Fazenda** (projeto fictício usado nos testes do Berrante): Loki (logs), Prometheus
(métricas) e Grafana (painéis).

## Subir

```bash
cp .env.example .env
docker network create fazenda-network   # se ainda não existir (a fazenda-api usa a mesma rede)
docker compose up -d
```

| Serviço | Endereço |
|---|---|
| Grafana | http://localhost:3001 |
| Loki | http://localhost:3101 |
| Prometheus | http://localhost:9092 |

## Alertas

| Alerta | Quando |
|---|---|
| `FazendaApiDown` | `/metrics` da API sem resposta há 2 min |
| `FazendaHigh5xxRate` | mais de 5 % de 5xx em 5 min |
