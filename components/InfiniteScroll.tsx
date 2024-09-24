"use client";
import { useCallback, useState } from "react";
import { ThreadCardFromHash } from "./ThreadCard";
import ActionButton from "./ActionButton";

export type InfiniteScrollProps = {
  replyTo: string;
  start: number;
};

export function InfiniteScroll(props: InfiniteScrollProps) {
  const [hashes, setHashes] = useState<string[]>([]);

  const next = useCallback(async () => {
    const u = new URL(window.location.href);
    u.pathname = `/t/${props.replyTo}/replies`;
    u.searchParams.set("skip", `${hashes.length + props.start}`);

    const resp = await fetch(u.toString());
    const threadHashes = await resp.text();
    const hs = threadHashes.split("\n");

    setHashes((prev) => {
      const h = hs.filter((x) => !prev.includes(x));
      return prev.concat(h);
    });
  }, [setHashes, props.start, props.replyTo]);

  return (
    <>
      {hashes
        .filter((x) => x)
        .map((hash) => (
          <ThreadCardFromHash hash={hash} />
        ))}
      <span className="text-sm">
        <ActionButton label="More" onClick={next} />
      </span>
    </>
  );
}
