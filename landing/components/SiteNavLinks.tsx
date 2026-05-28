import Link from "next/link";

type SiteNavLinksProps = {
  active?: "protocol" | "documentation";
};

export default function SiteNavLinks({ active }: SiteNavLinksProps) {
  const protocolClassName = `nav-link ${active === "protocol" ? "nav-link-active" : ""}`.trim();
  const docsClassName = `nav-link ${active === "documentation" ? "nav-link-active" : ""}`.trim();

  return (
    <nav className="nav-links" aria-label="Primary">
      <div className="nav-links-primary">
        <Link href="/" className="nav-link">
          Start Here
        </Link>
        <Link href="/#products" className="nav-link">
          Products
        </Link>
        <Link href="/#security" className="nav-link">
          Security
        </Link>
      </div>

      <span className="nav-divider" aria-hidden="true" />

      <div className="nav-links-secondary">
        <Link href="/protocol" aria-current={active === "protocol" ? "page" : undefined} className={protocolClassName}>
          Protocol
        </Link>
        <Link href="/documentation" aria-current={active === "documentation" ? "page" : undefined} className={docsClassName}>
          Deploy Guide
        </Link>
      </div>
    </nav>
  );
}