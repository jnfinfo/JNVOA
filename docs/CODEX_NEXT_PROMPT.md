# Próximo prompt sugerido para o Codex

Trabalhe no repositório JNVOA seguindo integralmente o AGENTS.md.

Estado atual:

- Cloudflare Worker + React + D1 publicados;
- modo mock funcional;
- provider Amadeus com test/production, OAuth, cache de token, retry e reconfirmação;
- alertas financeiros só são gerados após Flight Offers Price no provider real;
- Cloudflare Access deve ser habilitado antes das credenciais reais;
- migration 0003 adiciona status de confirmação e diagnóstico da última consulta.

Próxima entrega:

1. Criar tela detalhada de uma rota.
2. Exibir as 10 melhores ofertas da última consulta.
3. Mostrar ida e volta separadamente, horários, números dos voos, escalas, duração, bagagem e preço por passageiro.
4. Criar endpoint paginado para ofertas recentes por monitor.
5. Adicionar ação de reconfirmação manual de uma oferta específica.
6. Não criar checkout nem reserva.
7. Não inventar link de compra quando o provider não retornar um link autorizado.
8. Preservar responsividade em 375 px.
9. Adicionar testes para o novo endpoint e normalização dos dados.
10. Executar typecheck, testes e build antes de concluir.
