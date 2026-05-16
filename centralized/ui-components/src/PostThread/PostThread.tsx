"use client";

import { useRouter } from "next/navigation";
import {
  PostThread as CorePostThread,
  PostThreadNarrow as CorePostThreadNarrow,
  type PostThreadProps as CorePostThreadProps,
} from "@userless/ui-components";
import { getUserlessUrl } from "../userless";

export type PostThreadProps = Pick<
  CorePostThreadProps,
  "replyTo" | "onFileCreated" | "onPostCreated"
>;

export function PostThread(props: PostThreadProps) {
  const router = useRouter();

  return (
    <CorePostThread
      {...props}
      onPostCreated={(hash, signedMessage) => {
        props.onPostCreated?.(hash, signedMessage);
        router.push(`/thread/${hash}`);
      }}
    />
  );
}

export function PostThreadNarrow(props: PostThreadProps) {
  const router = useRouter();

  return (
    <CorePostThreadNarrow
      {...props}
      onPostCreated={(hash, signedMessage) => {
        props.onPostCreated?.(hash, signedMessage);
        router.push(`/thread/${hash}`);
      }}
    />
  );
}
