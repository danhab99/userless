"use server";
import clsx from "clsx";
import style from "./Thread.module.css";
import { CommentProps, Comment } from "../Comment/Comment";
import Markdown from "react-markdown";
import { ActionButton, Hash } from "ui-components";
import { Reply } from "../Reply/Reply";

export type ThreadProps = {
  ownerEmail: string;
  ownerName: string;
  ownerFingerprint: string;
  timestamp: number;
  body: string;
  hash: string;

  enableDelete: boolean;
  replies: ThreadProps[];

  onDelete: () => void;
};

export async function Thread(props: ThreadProps) {
  const titleIndex = props.body.indexOf("\n");
  const title = props.body.slice(0, titleIndex).replace(/^#/, "");
  const body = props.body.slice(titleIndex);

  return (
    <div>
      <div className="bg-cyan-100 p-4">
        <small>
          <Hash content={props.hash} />
        </small>
        <h2 className="text-4xl underline bold pb-6">{title}</h2>

        <Markdown>{body}</Markdown>

        <Reply replyTo={props.hash} />
      </div>

      <div className="pl-4">
        {props.replies.map((props) => (
          <Comment {...props} />
        ))}
      </div>
    </div>
  );
}
