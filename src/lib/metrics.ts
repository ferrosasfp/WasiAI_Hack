import client, { Counter, Histogram, Registry } from 'prom-client';

// Simple metrics singleton and helpers

type Meters = {
  registry: Registry;
  counters: Record<string, Counter<string>>;
  histos: Record<string, Histogram<string>>;
};

const g: any = globalThis as any;
let METERS: Meters | null = g.__METERS__ || null;

function createMeters(): Meters {
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const counters: Record<string, Counter<string>> = {
    protected_fetch_total: new client.Counter({
      name: 'protected_fetch_total',
      help: 'Total de requests a /api/protected/fetch por estado',
      labelNames: ['status', 'error'] as const,
      registers: [registry],
    }),
    keys_get_total: new client.Counter({
      name: 'keys_get_total',
      help: 'Total de requests a /api/keys/get por estado',
      labelNames: ['status'] as const,
      registers: [registry],
    }),
    keys_put_total: new client.Counter({
      name: 'keys_put_total',
      help: 'Total de requests a /api/keys/put por estado',
      labelNames: ['status'] as const,
      registers: [registry],
    }),
    gateway_failures_total: new client.Counter({
      name: 'gateway_failures_total',
      help: 'Fallos al obtener contenido desde gateways IPFS',
      labelNames: ['gateway'] as const,
      registers: [registry],
    }),
  } as any;

  const buckets = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const histos: Record<string, Histogram<string>> = {
    protected_fetch_latency_ms: new client.Histogram({
      name: 'protected_fetch_latency_ms',
      help: 'Latencia total de /api/protected/fetch (ms)',
      buckets,
      registers: [registry],
    }),
    decrypt_latency_ms: new client.Histogram({
      name: 'decrypt_latency_ms',
      help: 'Latencia de descifrado AES-GCM (ms)',
      buckets,
      registers: [registry],
    }),
    gateway_fetch_latency_ms: new client.Histogram({
      name: 'gateway_fetch_latency_ms',
      help: 'Latencia para descargar el contenido cifrado desde gateway (ms)',
      buckets,
      labelNames: ['gateway'] as const,
      registers: [registry],
    }),
  } as any;

  return { registry, counters, histos };
}

export function metricsEnabled(): boolean {
  return String(process.env.METRICS_ENABLED || 'false').toLowerCase() === 'true';
}

export function getMeters(): Meters | null {
  if (!metricsEnabled()) return null;
  if (!METERS) {
    METERS = createMeters();
    g.__METERS__ = METERS;
  }
  return METERS;
}

export function incCounter(name: keyof Meters['counters'], labels?: Record<string, string>): void {
  const m = getMeters();
  if (!m) return;
  m.counters[name as string].inc(labels || {});
}

export function observeHisto(name: keyof Meters['histos'], vMs: number, labels?: Record<string, string>): void {
  const m = getMeters();
  if (!m) return;
  m.histos[name as string].observe(labels || {}, vMs);
}

export async function renderMetrics(): Promise<string> {
  const m = getMeters();
  if (!m) return '';
  return await m.registry.metrics();
}
