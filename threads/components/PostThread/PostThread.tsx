"use client";

export type PostThreadProps = {
  replyTo?: string;
};

export const PostThread = (props: PostThreadProps) => {
  return (
    <div>
      <p>PostThread component - TODO: Implement</p>
      <p>ReplyTo: {props.replyTo || "None"}</p>
    </div>
  );
};

export const PostThreadNarrow = PostThread;
