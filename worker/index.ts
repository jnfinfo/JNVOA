import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import { newId } from './lib/id';
import { getProvider } from './providers';
import { getSerpApiQuota } from './providers/serpapi';
import { getDashboardData } from './services/dashboard-service';
import { executeMonitor, runActiveMonitors } from './services/monitor-service';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

const monitorSchema = z.object({
  name: z.string().trim().min(3).max(80),
  origin: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  destination: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  outboundDate: z.iso.date(),
  returnDate: z.iso.date(),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9),
  targetPrice: z.number().positive(),
  directOnly: z.boolean(),
  baggageRequired: z.boolean()
}).refine((data) => data.returnDate >= data.outboundDate, {
  message: 'A data de volta deve ser igual ou posterior à ida.',
  path: ['returnDate']
});

const manualSearchSchema = z.object({
  origin: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  destination: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  outboundDate: z.iso.date(),
  returnDate: z.iso.date(),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9),
  directOnly: z.boolean(),
  baggageRequired: z.boolean()
}).refine((data) => data.returnDate >= data.outboundDate, {
  message: 'A data de volta deve ser igual ou posterior à ida.',
  path: ['returnDate']
});

const monitorRunSchema = z.object({
  outboundDate: z.iso.date(),
  returnDate: z.iso.date()
}).refine((data) => data.returnDate >= data.outboundDate, {
  message: 'A data de volta deve ser igual ou posterior à ida.',
  path: ['returnDate']
});

app.use('/api/*', logger());
app.use('/api/*', secureHeaders());
app.use('/api/*', async (c, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) {
      return c.json({ error: 'Origem não autorizada.' }, 403);
    }
  }
  await next();
});

app.get('/api/health', (c) => c.json({
  ok: true,
  app: c.env.APP_NAME,
  provider: c.env.FLIGHT_PROVIDER,
  providerEnvironment: c.env.FLIGHT_PROVIDER === 'serpapi'
    ? 'google-flights'
    : c.env.FLIGHT_PROVIDER === 'amadeus'
      ? c.env.AMADEUS_ENV ?? 'test'
      : 'simulado',
  timestamp: new Date().toISOString()
}));

app.get('/api/provider/status', async (c) => {
  const credentialsConfigured = c.env.FLIGHT_PROVIDER === 'serpapi'
    ? Boolean(c.env.SERPAPI_API_KEY)
    : c.env.FLIGHT_PROVIDER === 'amadeus'
      ? Boolean(c.env.AMADEUS_CLIENT_ID && c.env.AMADEUS_CLIENT_SECRET)
      : true;

  return c.json({
    provider: c.env.FLIGHT_PROVIDER,
    environment: c.env.FLIGHT_PROVIDER === 'serpapi'
      ? 'google-flights'
      : c.env.FLIGHT_PROVIDER === 'amadeus'
        ? c.env.AMADEUS_ENV ?? 'test'
        : 'simulado',
    credentialsConfigured,
    quota: c.env.FLIGHT_PROVIDER === 'serpapi' ? await getSerpApiQuota(c.env) : undefined,
    alertsConfigured: Boolean(c.env.ALERT_WEBHOOK_URL)
  });
});

app.get('/api/dashboard', async (c) => {
  const data = await getDashboardData(c.env);
  return c.json(data, 200, {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300'
  });
});

app.get('/api/monitors', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT * FROM monitors WHERE active = 1 ORDER BY created_at DESC
  `).all();
  return c.json({ items: result.results });
});

app.post('/api/search/manual', async (c) => {
  const body = await c.req.json<unknown>();
  const parsed = manualSearchSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, 400);
  }

  const item = parsed.data;
  const provider = getProvider(c.env);
  const offers = await provider.search({
    origin: item.origin,
    destination: item.destination,
    outboundDate: item.outboundDate,
    returnDate: item.returnDate,
    adults: item.adults,
    children: item.children,
    currency: c.env.DEFAULT_CURRENCY,
    directOnly: item.directOnly,
    baggageRequired: item.baggageRequired
  });

  return c.json({
    query: {
      origin: item.origin,
      destination: item.destination,
      outboundDate: item.outboundDate,
      returnDate: item.returnDate
    },
    offers: offers.slice(0, 8).map((offer) => ({
      externalId: offer.externalId,
      carrier: offer.carrier,
      flightNumbers: offer.flightNumbers,
      priceTotal: offer.priceTotal,
      pricePerPerson: offer.pricePerPerson,
      currency: offer.currency,
      stops: offer.stops,
      durationMinutes: offer.durationMinutes,
      baggageIncluded: offer.baggageIncluded,
      departureAt: offer.departureAt,
      arrivalAt: offer.arrivalAt,
      bookingUrl: offer.bookingUrl
    })),
    quota: c.env.FLIGHT_PROVIDER === 'serpapi' ? await getSerpApiQuota(c.env) : undefined
  });
});

app.post('/api/monitors', async (c) => {
  const body = await c.req.json<unknown>();
  const parsed = monitorSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, 400);
  }

  const id = newId('monitor');
  const familyId = 'family-safadi';
  const item = parsed.data;

  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO families (id, name) VALUES (?, 'Família Safadi')
  `).bind(familyId).run();

  await c.env.DB.prepare(`
    INSERT INTO monitors (
      id, family_id, name, origin, destination, outbound_date, return_date,
      adults, children, target_price, direct_only, baggage_required, currency, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    id,
    familyId,
    item.name,
    item.origin,
    item.destination,
    item.outboundDate,
    item.returnDate,
    item.adults,
    item.children,
    item.targetPrice,
    item.directOnly ? 1 : 0,
    item.baggageRequired ? 1 : 0,
    c.env.DEFAULT_CURRENCY
  ).run();

  c.executionCtx.waitUntil(
    executeMonitor(c.env, id).catch((error) => console.error('Primeira consulta falhou', error))
  );

  return c.json({ id }, 201);
});

app.post('/api/monitors/:id/run', async (c) => {
  const rawBody = await c.req.json<unknown>().catch(() => undefined);
  const parsed = rawBody === undefined ? undefined : monitorRunSchema.safeParse(rawBody);

  if (parsed && !parsed.success) {
    return c.json({ error: 'Combinação de datas inválida.', details: parsed.error.flatten() }, 400);
  }

  const result = await executeMonitor(
    c.env,
    c.req.param('id'),
    parsed?.success ? parsed.data : undefined
  );
  return c.json({ ok: true, ...result });
});

app.patch('/api/monitors/:id/status', async (c) => {
  const payload = z.object({ active: z.boolean() }).safeParse(await c.req.json<unknown>());
  if (!payload.success) return c.json({ error: 'Status inválido.' }, 400);

  const result = await c.env.DB.prepare(`
    UPDATE monitors SET active = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(payload.data.active ? 1 : 0, c.req.param('id')).run();

  if (!result.meta.changes) return c.json({ error: 'Monitoramento não encontrado.' }, 404);
  return c.json({ ok: true });
});

app.onError((error, c) => {
  console.error(error);
  return c.json({
    error: 'Não foi possível concluir a operação.',
    message: error.message
  }, 500);
});

app.notFound((c) => c.json({ error: 'Rota não encontrada.' }, 404));

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runActiveMonitors(env));
  }
} satisfies ExportedHandler<Env>;
