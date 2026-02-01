import Link from "next/link";
import { getServer } from "@/lib/userless";

export async function Header(props: React.PropsWithChildren) {
  const server = await getServer();
  const banner = await server.getBanner();


  return (
    <>
      <nav>
        <Link href="/">
          <span>Userless.xyz</span>
        </Link>

        {(banner.info["threads"]["frontpage"] ?? []).map((x: string) => <Link href={`/thread/${x}`}>{x}</Link>)}
      </nav>
      {props.children}
    </>
  );
}
