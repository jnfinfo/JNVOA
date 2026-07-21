# JN Voa

BI familiar para monitorar preços de passagens aéreas, guardar histórico, identificar tendências e alertar quando uma viagem atinge o preço desejado.

## Estado atual

- Dashboard responsivo para celular, tablet e navegador.
- PWA instalável.
- Cloudflare Worker com API Hono.
- D1 com migrações para famílias, monitoramentos, execuções, ofertas, histórico e alertas.
- Cron Trigger a cada 6 horas.
- Provider `mock` funcional para desenvolvimento e demonstração.
- Provider Amadeus implementado e ativável por configuração.
- Cadastro de novas viagens e consulta manual por rota.
- Gráficos de tendência, companhias e mapa de dias mais baratos.
- Documentação e regras para o Codex em `AGENTS.md`.

## Stack

- React + TypeScript + Vite
- Recharts
- Hono
- Cloudflare Workers Static Assets
- Cloudflare D1
- Cloudflare Cron Triggers
- Vite PWA

## Rodar localmente

```bash
npm install
npm run db:migrate:local
npm run dev
```

Abra `http://localhost:5173`.

## Testes e build

```bash
npm test
npm run typecheck
npm run build
```

## Publicação

Leia [`docs/CLOUDFLARE_DEPLOY.md`](docs/CLOUDFLARE_DEPLOY.md).

## Providers

O projeto inicia com:

```json
"FLIGHT_PROVIDER": "mock"
```

Depois de configurar as credenciais Amadeus, altere para:

```json
"FLIGHT_PROVIDER": "amadeus"
```

Credenciais nunca devem entrar no Git. Use `wrangler secret put`.

## Estrutura principal

```text
src/                    frontend React
worker/                 API, providers e tarefas agendadas
migrations/             schema e dados iniciais D1
docs/                   arquitetura, deploy e roadmap
AGENTS.md                regras para agentes/Codex
wrangler.jsonc           configuração Cloudflare
```

## Aviso de negócio

Valores exibidos são indicativos. Antes de compra ou alerta final, a oferta deve ser atualizada/reconfirmada no provider. O sistema não realiza reserva nem pagamento nesta fase.
