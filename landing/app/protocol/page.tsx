import Link from "next/link";
import type { Metadata } from "next";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import SiteNavLinks from "../../components/SiteNavLinks";

export const metadata: Metadata = {
  title: "Protocol Specification | Userless",
  description:
    "The Userless Protocol — decentralised social media with cryptographic identity, signed content, and portable deployment.",
};

export const dynamic = "force-static";

function readFirstExisting(candidates: string[]): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }

  throw new Error(
    `Unable to locate PROTOCOL.md. Tried: ${candidates.join(", ")}`,
  );
}

function getProtocolMarkdown(): string {
  const cwd = process.cwd();
  return readFirstExisting([
    join(cwd, "centralized", "PROTOCOL.md"),
    join(cwd, "..", "centralized", "PROTOCOL.md"),
    join(cwd, "landing", "..", "centralized", "PROTOCOL.md"),
  ]);
}

// Extract h2 headings for the sidebar TOC
function extractTocEntries(markdown: string): { id: string; label: string }[] {
  const entries: { id: string; label: string }[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      const label = match[1].trim();
      const id = label
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      entries.push({ id, label });
    }
  }
  return entries;
}

// Derive an anchor id from heading text the same way extractTocEntries does
function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const mdComponents: Components = {
  h1: ({ children }) => <h1 className="proto-title">{children}</h1>,
  h2: ({ children }) => {
    const text = typeof children === "string" ? children : String(children ?? "");
    return <h2 id={headingId(text)}>{children}</h2>;
  },
  h3: ({ children }) => <h3>{children}</h3>,
  table: ({ children }) => (
    <div className="proto-table-wrap">
      <table className="proto-table">{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre>{children}</pre>,
  code: ({ children, className }) => (
    <code className={className}>{children}</code>
  ),
};

export default function ProtocolPage() {
  const markdown = getProtocolMarkdown();
  const toc = extractTocEntries(markdown);

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="shell nav-shell">
          <Link href="/" className="brand-mark">
            Userless
          </Link>
          <SiteNavLinks active="protocol" />
        </div>
      </header>

      <main>
        <div className="proto-layout shell">
          <aside className="proto-toc">
            <p className="section-title">Contents</p>
            <nav>
              <ol className="toc-list">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="toc-link">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="proto-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
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

