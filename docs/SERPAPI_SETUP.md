# SerpApi + Google Flights

## Comportamento desta fase

- somente uma rota é monitorada automaticamente: CNF → REC;
- ida flexível de 26/12/2026 a 29/12/2026;
- volta flexível de 04/01/2027 a 06/01/2027;
- as 12 combinações possíveis são consultadas em rodízio;
- o Cron executa às 06h e 18h no horário de Brasília;
- a aba de consulta manual aceita qualquer rota e datas exatas;
- o painel usa a Account API da SerpApi para mostrar limite, consumo e saldo.

Com duas consultas automáticas por dia, a rota consome aproximadamente 60 pesquisas em um mês de 30 dias. O restante da franquia fica disponível para consultas manuais.

## Cadastrar a chave sem expor o valor

Na pasta do projeto:

```powershell
npx wrangler secret put SERPAPI_API_KEY
```

Cole a Private API Key quando o Wrangler solicitar. O valor não é salvo no GitHub nem no `wrangler.jsonc`.

Confira somente o nome do secret:

```powershell
npx wrangler secret list
```

## Aplicar banco e publicar

```powershell
npm run db:migrate:remote
npm run deploy
```

Valide:

```text
/api/health
/api/provider/status
```

O status esperado é:

```json
{
  "provider": "serpapi",
  "environment": "google-flights",
  "credentialsConfigured": true
}
```

## Observação sobre viagens de ida e volta

A consulta principal do Google Flights retorna o preço total da viagem e as opções iniciais. Obter todos os detalhes do trecho de volta exige uma segunda consulta com `departure_token`. Para preservar a franquia gratuita, o monitor usa uma pesquisa por combinação e abre o Google Flights para a confirmação final.
