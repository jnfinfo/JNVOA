# Proteger o JN Voa com Cloudflare Access

O JN Voa possui operações que geram custo e dados familiares: criação de rotas, consultas manuais e chamadas ao provider. Antes de ativar preços reais, o Worker deve deixar de ser público.

## Configuração recomendada

1. Entre no painel Cloudflare.
2. Abra Workers & Pages > `jnvoa`.
3. Acesse Settings > Domains & Routes.
4. Na rota `jnvoa.<conta>.workers.dev`, clique em Enable Cloudflare Access.
5. Abra Manage Cloudflare Access.
6. Crie uma política `Allow`.
7. Em Include, selecione Emails e informe somente os e-mails da família.
8. Configure One-time PIN ou Google como método de login.
9. Use sessão de 30 dias para evitar login frequente no celular.

## Validação

Abra o endereço em uma janela anônima. A tela de autenticação deve aparecer antes do dashboard.

Depois do login:

- a PWA continua funcionando;
- chamadas `/api/*` usam o cookie de sessão da mesma origem;
- usuários não autorizados não alcançam nem o frontend nem a API;
- as credenciais Amadeus continuam armazenadas apenas como Worker Secrets.

## Regra operacional

Não use senha compartilhada gravada no JavaScript. Não coloque API Key, API Secret ou token administrativo no frontend.
