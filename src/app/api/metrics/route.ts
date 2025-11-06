import { NextRequest } from 'next/server';
import { renderMetrics, metricsEnabled } from '@/lib/metrics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    if (!metricsEnabled()) {
      return new Response('metrics disabled', { status: 404, headers: { 'content-type': 'text/plain' } });
    }
    const token = process.env.METRICS_TOKEN || '';
    if (token) {
      const auth = req.headers.get('authorization') || '';
      const hdr = req.headers.get('x-metrics-token') || '';
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
      const provided = hdr || bearer;
      if (provided !== token) {
        return new Response('unauthorized', { status: 401, headers: { 'content-type': 'text/plain' } });
      }
    }
    const body = await renderMetrics();
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/plain; version=0.0.4',
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return new Response(String(e?.message || e), { status: 500, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
  }
}
