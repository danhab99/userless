"use client";

import { useRouter } from "next/navigation";
import {
  PostThread as CorePostThread,
  PostThreadNarrow as CorePostThreadNarrow,
  type PostThreadProps as CorePostThreadProps,
} from "@userless/ui-components";
import { getUserlessUrl } from "../userless";

export type PostThreadProps = Pick<CorePostThreadProps, "replyTo">;

export function PostThread(props: PostThreadProps) {
  const router = useRouter();

  return (
    <CorePostThread
      {...props}
      onPosted={(hash) => router.push(`/thread/${hash}`)}
      userlessUrl={getUserlessUrl()}
    />
  );
}

export function PostThreadNarrow(props: PostThreadProps) {
  const router = useRouter();

  return (
    <CorePostThreadNarrow
      {...props}
      onPosted={(hash) => router.push(`/thread/${hash}`)}
      userlessUrl={getUserlessUrl()}
    />
  );
}
