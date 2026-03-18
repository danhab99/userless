import clsx from "clsx";
import style from "./Thread.module.css";
import { CommentProps, Comment } from "../Comment/Comment";
import Markdown from "react-markdown";

export type ThreadProps = {
  ownerEmail: string;
  ownerName: string;
  timestamp: number;
  body: string;
  hash: string;

  enableDelete: boolean;
  replies: CommentProps[];

  onDelete: () => void;
};

export function Thread(props: ThreadProps) {
  const titleIndex = props.body.indexOf("\n");
  const title = props.body.slice(0, titleIndex).replace(/^#/, "");
  const body = props.body.slice(titleIndex);

  return (
    <div>
      <div className="bg-cyan-100 p-4">
        <h2 className="text-4xl underline bold pb-6">{title}</h2>

        <Markdown>{body}</Markdown>
      </div>

      <div className="pl-4">
        {props.replies.map((props) => (
          <Comment {...props} />
        ))}
      </div>
    </div>
  );
}
