# Ativar preços reais com Amadeus

## Antes de ativar

Proteja o Worker com Cloudflare Access. Enquanto o endereço estiver público, qualquer pessoa pode criar monitoramentos e consumir a franquia da API.

No painel Cloudflare:

1. Workers & Pages.
2. Abra o Worker `jnvoa`.
3. Settings > Domains & Routes.
4. Na rota `workers.dev`, habilite Cloudflare Access.
5. Permita somente os e-mails da família.
6. Use One-time PIN ou um provedor de identidade como Google.

## Criar as credenciais

1. Crie uma conta no portal Amadeus for Developers.
2. Abra o Self-Service Workspace.
3. Crie uma aplicação chamada `JN Voa`.
4. Copie a API Key e a API Secret.

Nunca cole essas chaves em `wrangler.jsonc`, GitHub, prints ou mensagens.

## Gravar os segredos no Cloudflare

Na pasta do projeto:

```powershell
npx wrangler secret put AMADEUS_CLIENT_ID
npx wrangler secret put AMADEUS_CLIENT_SECRET
```

O Wrangler pedirá os valores sem gravá-los no repositório.

Confira apenas os nomes configurados:

```powershell
npx wrangler secret list
```

## Ambiente de teste

Mantenha inicialmente:

```json
"FLIGHT_PROVIDER": "amadeus",
"AMADEUS_ENV": "test"
```

O ambiente de teste usa dados limitados e parcialmente em cache. Ele serve para validar autenticação, formato das respostas, persistência e telas; não deve ser usado como referência definitiva de compra.

Depois:

```powershell
npm run db:migrate:remote
npm run deploy
```

Valide:

```text
/api/health
/api/provider/status
```

O provider deve aparecer como `amadeus`, o ambiente como `test` e as credenciais como configuradas.

## Ambiente de produção

Depois de habilitar a aplicação para produção no portal Amadeus, altere:

```json
"AMADEUS_ENV": "production"
```

Use as credenciais de produção nos mesmos nomes de secrets e publique novamente.

## Como o JN Voa usa a Amadeus

- autenticação OAuth 2.0 Client Credentials;
- cache temporário do access token no Worker;
- até três tentativas para erros transitórios e limites de requisição;
- pesquisa pelo Flight Offers Search;
- normalização de companhia, preço, duração, escalas e bagagem;
- reconfirmação da melhor oferta pelo Flight Offers Price antes de emitir alerta financeiro;
- nenhum alerta real é enviado quando a reconfirmação falha;
- alertas iguais são deduplicados por 24 horas.

## Limitações conhecidas

A Amadeus Self-Service não cobre todas as companhias e tarifas disponíveis em metabuscadores. Algumas companhias de baixo custo e determinados grandes grupos podem não aparecer, e as tarifas são publicadas, não negociadas.

Por isso, a arquitetura mantém múltiplos providers. A próxima fonte planejada é Skyscanner, condicionada à aprovação comercial. Google Flights e Decolar permanecem como conferência manual, sem scraping no MVP.
