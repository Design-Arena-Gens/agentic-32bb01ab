import { NextRequest } from 'next/server';
import { scanDomain, type ScanOptions } from '../../../lib/scan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = String(body.domain ?? '').trim();
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Missing domain' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const options = (body.options ?? {}) as ScanOptions;
    const data = await scanDomain(domain, options);
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
