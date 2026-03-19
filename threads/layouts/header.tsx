import Link from "next/link";
import { getServer } from "ui-components";

export async function Header(props: React.PropsWithChildren) {
  const server = getServer();
  const banner = await server.getBanner();


  return (
    <>
      <nav className="flex flex-start items-center">
        <Link href="/" className="pr-8">
          <span>Userless.xyz</span>
        </Link>

        {(banner.info["threads"]["frontpage"] ?? []).map((x: string) => <Link className="text-xs text-green-800" href={`/thread/${x}`}>[ {x.slice(0, 8)} ]</Link>)}

      </nav>
      {props.children}
    </>
  );
}
