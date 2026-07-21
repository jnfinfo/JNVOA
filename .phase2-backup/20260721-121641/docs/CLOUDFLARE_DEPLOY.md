# Publicar no Cloudflare

## 1. Pré-requisitos

- Conta Cloudflare.
- Node.js 22 ou superior.
- Repositório GitHub criado, preferencialmente privado.

## 2. Login

Na pasta do projeto:

```bash
npx wrangler login
npx wrangler whoami
```

## 3. Criar o D1

```bash
npm run db:create
```

O comando retorna um `database_id`. Substitua `REPLACE_AFTER_D1_CREATE` em `wrangler.jsonc` pelo ID retornado.

## 4. Aplicar migrations

```bash
npm run db:migrate:remote
```

O seed cria a família e algumas rotas de demonstração.

## 5. Primeira publicação

Mantenha inicialmente:

```json
"FLIGHT_PROVIDER": "mock"
```

Depois execute:

```bash
npm run deploy
```

O Cloudflare fornecerá um endereço `*.workers.dev`.

## 6. Configurar Amadeus

Crie um aplicativo no portal Amadeus e grave os segredos:

```bash
npx wrangler secret put AMADEUS_CLIENT_ID
npx wrangler secret put AMADEUS_CLIENT_SECRET
```

Altere no `wrangler.jsonc`:

```json
"FLIGHT_PROVIDER": "amadeus"
```

Publique novamente:

```bash
npm run deploy
```

## 7. Proteger para a família

No painel Cloudflare Zero Trust:

1. Access > Applications.
2. Add an application > Self-hosted.
3. Informe o domínio do JN Voa.
4. Crie política `Allow` somente para os e-mails da família.
5. Use One-time PIN ou Google como identidade.

Não implemente senha simples compartilhada dentro do aplicativo.

## 8. Domínio próprio

Depois da validação no `workers.dev`, configure uma Custom Domain, por exemplo:

```text
voa.jnfinformatica.com.br
```

## 9. GitHub Actions

O workflow `.github/workflows/deploy.yml` requer estes secrets no GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

O token precisa de permissão para Workers Scripts e D1.
