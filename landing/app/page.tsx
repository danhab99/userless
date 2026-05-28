import Link from "next/link";
import SiteNavLinks from "../components/SiteNavLinks";

function OrbitIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M4 12a8 8 0 0 1 8-8" />
      <path d="M20 12a8 8 0 0 1-8 8" />
      <path d="M16 4a8 8 0 0 1 4 8" />
      <path d="M8 20a8 8 0 0 1-4-8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 6v6c0 5.5 3.4 8.7 8 10 4.6-1.3 8-4.5 8-10V6l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19c2-1 4-2 5-5" />
      <path d="M15 5c3 0 4 1 4 4-2 5-6 8-11 10 2-5 5-9 10-11Z" />
      <path d="M9 13 5 9" />
      <path d="m14 8 2 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="shell nav-shell">
          <p className="brand-mark">Userless</p>
          <SiteNavLinks />
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />
          <div className="shell hero-grid">
            <div className="hero-copy reveal-fast">
              <p className="eyebrow">Protocol-native publishing</p>
              <h1 className="display-title">
                Deploy social spaces with
                <span className="hero-script"> zero accounts</span>
              </h1>
              <p className="hero-text">
                Userless is a cryptographic social protocol where keys are identity, signatures
                are trust, and content can move across servers without lock-in.
              </p>
              <div className="hero-actions">
                <a href="#deploy" className="btn btn-primary">
                  Start deployment <ArrowIcon />
                </a>
                <a href="#products" className="btn btn-ghost">
                  Explore interfaces
                </a>
              </div>
            </div>

            <div className="reveal-slow">
              <div className="hero-panel">
                <p className="hero-panel-title">Deploy checklist</p>
                <ol className="hero-checklist">
                  <li className="check-item">1. Choose centralized or p2p topology</li>
                  <li className="check-item">2. Start server, register your public key</li>
                  <li className="check-item">3. Publish signed content from any UI</li>
                </ol>
                <Link
                  href="https://github.com/userless"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-link"
                >
                  View source organization <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="section-pad">
          <div className="shell">
            <p className="section-title">Core guarantees</p>
            <div className="feature-grid">
              <article className="feature-card reveal-fast">
                <div className="feature-icon">
                  <OrbitIcon />
                </div>
                <h3>Portable identity</h3>
                <p>
                  Public keys are the account layer. No email resets, no password storage,
                  no platform-specific identity silo.
                </p>
              </article>
              <article className="feature-card reveal-fast delay-1">
                <div className="feature-icon">
                  <ShieldIcon />
                </div>
                <h3>Signed content</h3>
                <p>
                  Threads, replies, and files are signed at the edge so provenance can be
                  verified anywhere in the network.
                </p>
              </article>
              <article className="feature-card reveal-fast delay-2">
                <div className="feature-icon">
                  <RocketIcon />
                </div>
                <h3>Deployment freedom</h3>
                <p>
                  Run a centralized server, a p2p node, or both. The protocol remains open and
                  composable across surfaces.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="products" className="section-pad">
          <div className="shell">
            <p className="section-title">Interfaces</p>
            <div className="surface-grid">
              <Link href="http://localhost:3000" className="surface-card">
                <h3>threads</h3>
                <p>Forum-like workflow for posting signed content and managing key identity.</p>
                <span>Open local app <ArrowIcon /></span>
              </Link>
              <Link href="http://localhost:3001" className="surface-card">
                <h3>redditless</h3>
                <p>Community-style feeds with nested discussions and moderation patterns.</p>
                <span>Open local app <ArrowIcon /></span>
              </Link>
              <Link href="http://localhost:5173" className="surface-card">
                <h3>p2p</h3>
                <p>Browser peer mesh over WebRTC for direct exchange without always-on servers.</p>
                <span>Open local app <ArrowIcon /></span>
              </Link>
            </div>
          </div>
        </section>

        <section id="deploy" className="section-last">
          <div className="shell deploy-band reveal-slow">
            <div>
              <p className="eyebrow">Ready for first deploy?</p>
              <h2 className="deploy-title">
                Stand up your first Userless stack and publish your first signed thread today.
              </h2>
            </div>
            <div className="deploy-links">
              <Link href="https://github.com/userless/userless/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Deployment guide <ArrowIcon />
              </Link>
              <Link href="https://github.com/userless/userless/blob/main/centralized/PROTOCOL.md" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Protocol spec
              </Link>
              <Link href="/documentation" className="btn btn-ghost">
                Local docs page
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell footer-shell">
          <span>MIT Licensed</span>
          <span>Go | Next.js | OpenPGP</span>
        </div>
      </footer>
    </div>
  );
}
