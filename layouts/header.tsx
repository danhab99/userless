import Link from "next/link";

export function Header(props: React.PropsWithChildren) {
  return (
    <>
      <header className="p-8 text-center">
        <Link href="/">
          <h1>PGChan.gpg</h1>
        </Link>
        <p>
          PGChan is an activity-pub compliant file board that uses GPG for role
          based access control.
        </p>
      </header>
      {props.children}
    </>
  );
}
