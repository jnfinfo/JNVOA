# AGENTS.md — JN Voa

## Missão

Construir um BI familiar confiável para monitorar passagens, mantendo histórico próprio e reduzindo a necessidade de abrir repetidamente Google Flights, Decolar e outros sites.

## Princípios obrigatórios

1. Preservar a arquitetura Cloudflare-first: React + Worker + D1 + Cron.
2. Não introduzir scraping de Google Flights, Decolar ou sites similares sem decisão explícita, análise jurídica e isolamento técnico.
3. Providers devem implementar a interface `FlightProvider`.
4. Nunca expor chaves no frontend, logs, commits ou respostas da API.
5. Toda oferta precisa registrar provider, momento da captura e moeda.
6. Preço de passagem é volátil: reconfirmar antes de alertas de compra e antes de abrir link de reserva.
7. O dashboard deve continuar funcional no celular a partir de 320 px.
8. Não remover o modo `mock`; ele é necessário para testes, demonstração e desenvolvimento sem consumir API.
9. D1 deve ser acessado apenas pelo Worker. O navegador nunca recebe credenciais de banco ou provider.
10. Mudanças de schema exigem nova migration; não editar migrations já publicadas.

## Organização

- `src/`: somente UI, estado e cliente HTTP.
- `worker/providers/`: integrações externas.
- `worker/services/`: casos de uso e persistência.
- `worker/lib/`: utilitários puros.
- `migrations/`: evolução incremental do banco.
- `docs/`: decisões arquiteturais e operação.

## Convenções

- TypeScript estrito, sem `any` salvo em fronteiras externas documentadas.
- IDs com `crypto.randomUUID()` e prefixo semântico.
- Datas em ISO-8601 no banco e API.
- Valores monetários como `REAL` no MVP; planejar migração para centavos inteiros antes de reservas/pagamentos.
- API sob `/api/*`.
- Mensagens visíveis em português do Brasil.
- Nomes técnicos e código em inglês.

## Definition of Done

Antes de concluir uma tarefa:

```bash
npm run typecheck
npm test
npm run build
```

Além disso:

- testar largura de 375 px e desktop;
- garantir tratamento de loading, vazio e erro;
- não quebrar o provider mock;
- atualizar documentação quando houver decisão arquitetural.

## Próximas prioridades

1. Criar onboarding e proteção por Cloudflare Access.
2. Completar catálogo IATA de aeroportos com autocomplete.
3. Validar Amadeus em produção com rotas brasileiras e internacionais.
4. Implementar regras de alertas por percentual e preço-alvo.
5. Adicionar notificações por e-mail; WhatsApp somente via provedor oficial.
6. Adicionar Skyscanner como segundo provider após aprovação comercial.
7. Criar tela detalhada da rota com calendário flexível e ofertas.
8. Adicionar testes do Worker com Miniflare/Vitest.

## Não fazer sem autorização

- Compra automática de passagem.
- Armazenamento de cartão.
- Scraping agressivo ou bypass de CAPTCHA.
- Integração que viole termos de uso.
- Migração para Netlify, Firebase ou outra plataforma sem ADR e aprovação.
