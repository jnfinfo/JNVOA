# Estratégia de providers

## 1. Amadeus — primeiro provider real

Motivos:

- API oficial e documentada.
- Ambiente de teste.
- Pesquisa de ofertas detalhadas.
- Integração já implementada no projeto.

Limitações a validar:

- cobertura e tarifa real para rotas brasileiras;
- diferença entre ambiente de teste e produção;
- links de compra e regras de bagagem;
- cotas e custo por volume.

## 2. Skyscanner — segunda fonte

Usar após aprovação de parceria e emissão da chave. Será importante para comparação entre fornecedores e preços indicativos em datas flexíveis.

## 3. Duffel — fase futura

Considerar se o produto evoluir para reserva/compra. Não é necessário para o BI familiar inicial.

## 4. Google Flights e Decolar

Não integrar por scraping no MVP. Motivos:

- não há API pública simples equivalente à interface de busca;
- risco de quebra frequente;
- CAPTCHA e bloqueios;
- possível conflito com termos de uso;
- custo operacional alto para pouca confiabilidade.

O JN Voa pode guardar links externos para conferência manual sem extrair dados desses sites.

## Regra de normalização

Todos os providers devem devolver:

- preço total e por pessoa;
- moeda;
- companhia;
- voos;
- escalas;
- duração;
- bagagem;
- horários;
- link, quando autorizado;
- payload bruto apenas para diagnóstico e com retenção limitada.
