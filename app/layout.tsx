import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Subdomain Finder | Bug Bounty Tool',
  description: 'Enumerate subdomains via crt.sh, ThreatCrowd, and DNS validation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header>
            <h1>Subdomain Finder</h1>
            <p className="subtitle">Bug bounty subdomain enumeration (crt.sh, ThreatCrowd, brute-force + DNS)</p>
          </header>
          <main>{children}</main>
          <footer>
            <small>Built for Vercel deployment ? No API keys required</small>
          </footer>
        </div>
      </body>
    </html>
  );
}
