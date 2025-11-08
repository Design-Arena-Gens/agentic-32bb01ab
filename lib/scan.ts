import { COMMON_SUBDOMAINS } from "./wordlist";
import { fetchFromCrtSh, fetchFromThreatCrowd, generateBruteforceCandidates, sanitize } from "./sources";
import { resolveAllRecords, resolveDomainExists, runWithConcurrency, type DnsAnswer } from "./dns";

export type ScanOptions = {
  dnsValidate?: boolean;
  bruteForce?: boolean;
  concurrency?: number;
};

export type SubdomainRecord = {
  host: string;
  exists: boolean;
  records: DnsAnswer[];
};

export type ScanResult = {
  domain: string;
  totalCandidates: number;
  found: SubdomainRecord[];
  startedAt: string;
  finishedAt: string;
};

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function scanDomain(domainInput: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const domain = normalizeDomain(domainInput);
  const start = new Date();
  const { dnsValidate = true, bruteForce = true, concurrency = 20 } = opts;

  const [crt, tc] = await Promise.all([
    fetchFromCrtSh(domain).catch(() => []),
    fetchFromThreatCrowd(domain).catch(() => []),
  ]);

  const brute = bruteForce ? generateBruteforceCandidates(domain, COMMON_SUBDOMAINS) : [];
  const candidates = Array.from(new Set<string>([...crt, ...tc, ...brute]));

  if (!dnsValidate) {
    // If not validating DNS, mark all candidates as exists=false and no records
    const found = candidates.map((host): SubdomainRecord => ({ host, exists: false, records: [] }));
    return {
      domain,
      totalCandidates: candidates.length,
      found,
      startedAt: start.toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  const results = await runWithConcurrency(candidates, concurrency, async (host) => {
    const exists = await resolveDomainExists(host);
    if (!exists.exists) {
      return { host, exists: false, records: [] } as SubdomainRecord;
    }
    const records = await resolveAllRecords(host);
    return { host, exists: true, records } as SubdomainRecord;
  });

  const found = results.filter(Boolean) as SubdomainRecord[];

  return {
    domain,
    totalCandidates: candidates.length,
    found: found.filter(r => r.exists),
    startedAt: start.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}
