# Arquitetura

## Decisão

O JN Voa será um aplicativo full-stack em um único Cloudflare Worker:

```text
Celular / navegador
        |
React PWA + assets globais
        |
Cloudflare Worker /api
        |
+-------------------------------+
| D1 | Cron | secrets | logs    |
+-------------------------------+
        |
Providers de passagens
Amadeus -> Skyscanner -> outros
```

## Por que não separar Pages e API agora

O Worker com Static Assets publica frontend e API juntos, reduz CORS, configuração de domínios, pipelines e custos operacionais. O projeto pode ser dividido mais tarde caso volume ou equipes justifiquem.

## Banco

### Entidades

- `families`: núcleo de acesso familiar.
- `monitors`: viagens desejadas e filtros.
- `search_runs`: auditoria de cada consulta.
- `flight_offers`: ofertas retornadas por provider.
- `price_snapshots`: agregados por consulta usados nos gráficos.
- `alerts`: eventos relevantes.
- `provider_logs`: saúde e latência das APIs.

### Estratégia de retenção

- Manter snapshots por pelo menos 18 meses.
- Manter ofertas detalhadas por 90 dias no MVP.
- Depois de 90 dias, preservar agregados e eliminar JSON bruto.

## Execução agendada

Cron a cada 6 horas. A rotina busca os monitoramentos menos recentemente consultados e limita a rodada para proteger cota e CPU.

Evolução prevista:

- prioridade maior para viagens próximas;
- consulta adicional quando o preço se aproxima da meta;
- backoff em erro de provider;
- filas quando o volume justificar.

## Segurança

- Cloudflare Access para permitir somente e-mails da família.
- Segredos via Wrangler.
- Sem credenciais no frontend.
- Headers seguros via middleware.
- Logs sem dados sensíveis.

## Providers

Cada provider implementa:

```ts
interface FlightProvider {
  readonly name: string;
  search(request: FlightSearchRequest): Promise<FlightOffer[]>;
}
```

Isso permite trocar ou combinar fontes sem acoplar o dashboard.
