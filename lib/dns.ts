export type DnsAnswer = {
  name: string;
  type: number;
  TTL?: number;
  data: string;
};

export type ResolveResult = {
  exists: boolean;
  answers: DnsAnswer[];
};

const GOOGLE_DOH = "https://dns.google/resolve";

async function resolveOnce(name: string, type: string): Promise<DnsAnswer[] | null> {
  const url = `${GOOGLE_DOH}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, {
    headers: { "accept": "application/dns-json" },
    // 4s timeout via AbortController
    signal: AbortSignal.timeout(4000)
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as any;
  if (!json || typeof json !== "object") return null;
  if (json.Status !== 0 || !Array.isArray(json.Answer)) return null;
  return json.Answer as DnsAnswer[];
}

export async function resolveDomainExists(hostname: string): Promise<ResolveResult> {
  // Try A, AAAA, then CNAME
  const types = ["A", "AAAA", "CNAME"];
  for (const t of types) {
    try {
      const answers = await resolveOnce(hostname, t);
      if (answers && answers.length > 0) {
        return { exists: true, answers };
      }
    } catch {
      // ignore errors and continue
    }
  }
  return { exists: false, answers: [] };
}

export async function resolveAllRecords(hostname: string): Promise<DnsAnswer[]> {
  const attempts = ["A", "AAAA", "CNAME", "TXT"];
  const results: DnsAnswer[] = [];
  for (const t of attempts) {
    try {
      const answers = await resolveOnce(hostname, t);
      if (answers) results.push(...answers);
    } catch {
      // ignore
    }
  }
  return results;
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers: Promise<void>[] = [];

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        const r = await iterator(items[idx], idx);
        results[idx] = r;
      } catch (e) {
        // @ts-expect-error: store undefined on failure
        results[idx] = undefined;
      }
    }
  }

  const pool = Math.max(1, Math.min(limit, items.length));
  for (let w = 0; w < pool; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}
