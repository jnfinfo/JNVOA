# Publicar no Cloudflare

## 1. Pré-requisitos

- Conta Cloudflare.
- Node.js 22 ou superior.
- Repositório GitHub.

## 2. Login

```powershell
npx wrangler login
npx wrangler whoami
```

## 3. Banco D1

O banco remoto do projeto é `jnvoa-db`. Em uma instalação nova:

```powershell
npm run db:create
```

Copie o `database_id` para o binding `DB` em `wrangler.jsonc`.

## 4. Aplicar migrations

```powershell
npm run db:migrate:remote
```

Nunca altere uma migration já publicada. Crie um novo arquivo numerado.

## 5. Testar antes de publicar

```powershell
npm run typecheck
npm test
npm run build
```

## 6. Publicar

```powershell
npm run deploy
```

## 7. Segurança

Antes de ativar provider real, habilite Cloudflare Access na rota `workers.dev` do Worker e permita somente os e-mails da família.

Consulte [`CLOUDFLARE_ACCESS.md`](CLOUDFLARE_ACCESS.md).

## 8. Configurar Amadeus

```powershell
npx wrangler secret put AMADEUS_CLIENT_ID
npx wrangler secret put AMADEUS_CLIENT_SECRET
```

No `wrangler.jsonc`:

```json
"FLIGHT_PROVIDER": "amadeus",
"AMADEUS_ENV": "test"
```

Publique novamente e valide `/api/provider/status`.

Depois de obter credenciais de produção, troque apenas:

```json
"AMADEUS_ENV": "production"
```

Guia completo: [`AMADEUS_SETUP.md`](AMADEUS_SETUP.md).

## 9. Domínio próprio

Depois da validação, configure uma Custom Domain, por exemplo:

```text
voa.jnfinformatica.com.br
```

Para produção de longo prazo, prefira domínio próprio ao endereço `workers.dev`.

## 10. GitHub Actions

O workflow `.github/workflows/deploy.yml` requer:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

O token precisa de permissão para Workers Scripts e D1. As credenciais da Amadeus permanecem como Secrets do Worker e não entram no GitHub.
