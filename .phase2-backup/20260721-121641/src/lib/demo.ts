import type { DashboardData } from '../types';

export const demoDashboard: DashboardData = {
  generatedAt: new Date().toISOString(),
  provider: 'Modo demonstração',
  summary: {
    activeMonitors: 4,
    bestCurrentPrice: 10890,
    familySavings: 3860,
    checksLast24h: 16,
    averageChange7d: -6.8
  },
  priceHistory: [
    { date: '01/07', price: 14840, average: 14520 },
    { date: '04/07', price: 14290, average: 14380 },
    { date: '07/07', price: 13990, average: 14140 },
    { date: '10/07', price: 14520, average: 14110 },
    { date: '13/07', price: 13480, average: 13930 },
    { date: '16/07', price: 12840, average: 13620 },
    { date: '19/07', price: 11990, average: 13200 },
    { date: '21/07', price: 10890, average: 12840 }
  ],
  monitors: [
    {
      id: 'demo-orlando',
      name: 'Férias em Orlando',
      origin: 'CNF',
      destination: 'MCO',
      outboundDate: '2026-12-12',
      returnDate: '2026-12-27',
      adults: 2,
      children: 2,
      currentPrice: 10890,
      previousPrice: 11990,
      historicalMin: 10450,
      targetPrice: 11000,
      currency: 'BRL',
      carrier: 'Copa Airlines',
      stops: 1,
      durationMinutes: 780,
      baggageIncluded: true,
      signal: 'BUY',
      lastCheckedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      change7d: -9.2
    },
    {
      id: 'demo-recife',
      name: 'Janeiro em Recife',
      origin: 'CNF',
      destination: 'REC',
      outboundDate: '2027-01-08',
      returnDate: '2027-01-15',
      adults: 4,
      children: 1,
      currentPrice: 4620,
      previousPrice: 4490,
      historicalMin: 3980,
      targetPrice: 4200,
      currency: 'BRL',
      carrier: 'Azul',
      stops: 0,
      durationMinutes: 145,
      baggageIncluded: false,
      signal: 'WATCH',
      lastCheckedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      change7d: 2.9
    },
    {
      id: 'demo-lisboa',
      name: 'Lisboa em família',
      origin: 'GRU',
      destination: 'LIS',
      outboundDate: '2027-04-03',
      returnDate: '2027-04-17',
      adults: 3,
      children: 0,
      currentPrice: 13240,
      previousPrice: 13970,
      historicalMin: 12690,
      targetPrice: 13000,
      currency: 'BRL',
      carrier: 'TAP',
      stops: 0,
      durationMinutes: 590,
      baggageIncluded: true,
      signal: 'WATCH',
      lastCheckedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      change7d: -5.2
    },
    {
      id: 'demo-rio',
      name: 'Fim de semana no Rio',
      origin: 'CNF',
      destination: 'SDU',
      outboundDate: '2026-09-11',
      returnDate: '2026-09-13',
      adults: 2,
      children: 0,
      currentPrice: 1980,
      previousPrice: 1740,
      historicalMin: 1290,
      targetPrice: 1500,
      currency: 'BRL',
      carrier: 'Gol',
      stops: 0,
      durationMinutes: 65,
      baggageIncluded: false,
      signal: 'HIGH',
      lastCheckedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      change7d: 13.8
    }
  ],
  airlineComparison: [
    { carrier: 'Copa', price: 10890, stops: 1 },
    { carrier: 'Avianca', price: 11420, stops: 1 },
    { carrier: 'LATAM', price: 12680, stops: 1 },
    { carrier: 'American', price: 13850, stops: 1 },
    { carrier: 'Azul', price: 14490, stops: 2 }
  ],
  weekdayPrices: [
    { day: 'Seg', price: 12180, score: 64 },
    { day: 'Ter', price: 10890, score: 96 },
    { day: 'Qua', price: 11240, score: 88 },
    { day: 'Qui', price: 11990, score: 72 },
    { day: 'Sex', price: 13780, score: 38 },
    { day: 'Sáb', price: 14290, score: 28 },
    { day: 'Dom', price: 12840, score: 52 }
  ],
  alerts: [
    {
      id: 'a1',
      title: 'Orlando atingiu o preço-alvo',
      description: 'O total caiu para R$ 10.890, abaixo da meta de R$ 11.000.',
      createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      severity: 'good'
    },
    {
      id: 'a2',
      title: 'Lisboa caiu 5,2% em sete dias',
      description: 'A tendência virou para baixa. Vale acompanhar as próximas consultas.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'info'
    },
    {
      id: 'a3',
      title: 'Rio subiu acima da média',
      description: 'O valor atual está 53% acima do menor preço registrado.',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      severity: 'warning'
    }
  ]
};
