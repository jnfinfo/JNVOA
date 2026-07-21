# Estratégia de providers

## 1. Amadeus — primeiro provider real

Motivos:

- API oficial e documentada;
- ambiente de teste e produção;
- pesquisa detalhada de ofertas;
- endpoint de reconfirmação de preço e disponibilidade;
- integração implementada sem SDK Node, usando `fetch`, compatível com Workers.

Implementado:

- OAuth 2.0 Client Credentials;
- cache temporário de token;
- timeout, retry e renovação após HTTP 401;
- normalização de companhias, voos, preços, escalas, duração e bagagem;
- Flight Offers Price antes de alertas financeiros;
- marca visual de preço confirmado;
- ambiente selecionável por `AMADEUS_ENV=test|production`.

Limitações:

- Self-Service não cobre todas as companhias e tarifas dos metabuscadores;
- algumas companhias de baixo custo e grandes companhias podem ficar fora;
- retorna tarifas publicadas, não acordos negociados;
- o ambiente de teste possui dados limitados e parcialmente em cache;
- não entrega um link universal de checkout equivalente ao Google Flights.

## 2. Skyscanner — segunda fonte

Usar após aprovação de parceria e emissão da chave. Será importante para ampliar cobertura e comparação entre fornecedores, principalmente em datas flexíveis.

## 3. Duffel — fase futura

Considerar se o produto evoluir para reserva ou compra. Não é necessário para o BI familiar inicial.

## 4. Google Flights e Decolar

Não integrar por scraping no MVP:

- não existe uma API pública simples equivalente à tela de busca;
- risco de quebra frequente;
- CAPTCHA e bloqueios;
- risco de conflito com termos de uso;
- manutenção alta para baixa confiabilidade.

O JN Voa pode guardar links externos para conferência manual sem extrair dados dessas páginas.

## Regra de normalização

Todos os providers devem devolver:

- preço total e por pessoa;
- moeda;
- companhia e código;
- voos;
- escalas;
- duração;
- bagagem;
- horários;
- indicador de reconfirmação;
- link, quando autorizado;
- payload bruto apenas para diagnóstico e reconfirmação.
