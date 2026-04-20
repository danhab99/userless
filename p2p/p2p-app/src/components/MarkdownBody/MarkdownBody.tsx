import clsx from "clsx";
import style from "./MarkdownBody.module.css";
import Markdown from "react-markdown";

export type MarkdownBodyProps = {
  body: string
};

export function MarkdownBody(props: MarkdownBodyProps) {
  return <div className={clsx([style.MarkdownBody])}>
    <Markdown>{props.body}</Markdown>
  </div>;
}
