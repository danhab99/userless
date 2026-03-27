"use client";
import { ActionButton, PostThread } from "ui-components";
import { useState } from "react";

export type ReplyProps = {
  replyTo: string;
};

export function Reply(props: ReplyProps) {
  const [show, set] = useState(false);
  return (
    <>
      <ActionButton
        label="Reply"
        color="text-green-600"
        onClick={() => set((x) => !x)}
      />
      {show ? <PostThread replyTo={props.replyTo} /> : null}
    </>
  );
}
