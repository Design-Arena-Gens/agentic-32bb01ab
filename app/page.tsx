"use client";

import { useCallback, useMemo, useState } from "react";

type ScanRecord = {
  host: string;
  exists: boolean;
  records: { name: string; type: number; TTL?: number; data: string }[];
};

type ScanResponse = {
  domain: string;
  totalCandidates: number;
  found: ScanRecord[];
  startedAt: string;
  finishedAt: string;
};

export default function Page() {
  const [domain, setDomain] = useState("");
  const [dnsValidate, setDnsValidate] = useState(true);
  const [bruteForce, setBruteForce] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const canSubmit = domain.trim().length > 0 && !loading;

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, options: { dnsValidate, bruteForce } })
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as ScanResponse;
      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [domain, dnsValidate, bruteForce, canSubmit]);

  const resolvedCount = useMemo(() => result?.found.filter(r => r.exists).length ?? 0, [result]);

  const copyJson = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.domain}-subdomains.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <form className="form" onSubmit={onSubmit}>
        <div>
          <label className="mono" htmlFor="domain">Target domain</label>
          <input
            id="domain"
            className="input"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <button className="button" disabled={!canSubmit} type="submit">
          {loading ? <span className="row"><span className="spinner"/> Enumerating?</span> : 'Find subdomains'}
        </button>
      </form>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="toggle">
          <input type="checkbox" checked={dnsValidate} onChange={(e) => setDnsValidate(e.target.checked)} />
          DNS validate
        </label>
        <label className="toggle">
          <input type="checkbox" checked={bruteForce} onChange={(e) => setBruteForce(e.target.checked)} />
          Brute-force common prefixes
        </label>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              <span className="badge">Domain: {result.domain}</span>
              <span className="badge">Candidates: {result.totalCandidates}</span>
              <span className="badge">Resolved: {resolvedCount}</span>
            </div>
            <div className="actions">
              <button className="button secondary" onClick={copyJson} type="button">Copy JSON</button>
              <button className="button" onClick={downloadJson} type="button">Download JSON</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Host</th>
                  <th>Status</th>
                  <th>Records</th>
                </tr>
              </thead>
              <tbody>
                {result.found.map((r) => (
                  <tr key={r.host}>
                    <td className="mono">{r.host}</td>
                    <td>{r.exists ? '?' : '?'}</td>
                    <td className="mono">
                      {r.records && r.records.length > 0 ? (
                        r.records.slice(0, 4).map((ans, idx) => (
                          <span key={idx} style={{ display: 'inline-block', marginRight: 6 }}>
                            {ans.type}:{' '}{ans.data}
                          </span>
                        ))
                      ) : '?'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
