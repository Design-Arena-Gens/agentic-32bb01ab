import punycode from 'node:punycode';

function toASCII(host: string): string {
  try {
    return punycode.toASCII(host);
  } catch {
    return host;
  }
}

export function isLikelySubdomain(name: string, domain: string): boolean {
  const n = name.toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  const d = domain.toLowerCase().replace(/\.$/, "");
  return n === d || n.endsWith(`.${d}`);
}

export function sanitize(names: string[], domain: string): string[] {
  const out = new Set<string>();
  for (const raw of names) {
    const parts = String(raw)
      .split(/\s+/)
      .flatMap(x => x.split(/[,\n]/))
      .map(x => x.trim())
      .filter(Boolean);
    for (const p of parts) {
      const cleaned = toASCII(p.toLowerCase().replace(/\*\./g, "").replace(/^\./, "").replace(/\.$/, ""));
      if (!cleaned) continue;
      if (isLikelySubdomain(cleaned, domain)) out.add(cleaned);
    }
  }
  return Array.from(out);
}

export async function fetchFromCrtSh(domain: string): Promise<string[]> {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
  const res = await fetch(url, {
    headers: { 'accept': 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => [])) as any[];
  if (!Array.isArray(data)) return [];
  const names: string[] = [];
  for (const row of data) {
    if (row && typeof row === 'object') {
      const v = (row.name_value ?? row.common_name ?? '') as string;
      if (v) names.push(v);
    }
  }
  return sanitize(names, domain);
}

export async function fetchFromThreatCrowd(domain: string): Promise<string[]> {
  const url = `https://www.threatcrowd.org/searchApi/v2/domain/report/?domain=${encodeURIComponent(domain)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null) as any;
  if (!json || !Array.isArray(json.subdomains)) return [];
  return sanitize(json.subdomains as string[], domain);
}

export function generateBruteforceCandidates(domain: string, words: string[]): string[] {
  const base = domain.replace(/\.$/, "").toLowerCase();
  return words
    .map(w => `${w}.${base}`)
    .concat([base]);
}
