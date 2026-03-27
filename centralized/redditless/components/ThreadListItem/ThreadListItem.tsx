import clsx from "clsx";
import style from "./ThreadListItem.module.css";
import { getThreadTitle } from "@/lib/getThreadTitle";
import { Hash } from "ui-components";
import { ThreadProps } from "@/lib/thread";

export type ThreadListItemProps = ThreadProps;

export function ThreadListItem(props: ThreadListItemProps) {
  const [title] = getThreadTitle(props.body);
  return (
    <div className={clsx([style.ThreadListItem])}>
      <a href={`/${props.hash}`}>
        <h4 className="text-xl">
          <i className="text-yellow-500">
            <Hash content={props.hash} />
          </i>
          {" >>> "}
          <span className="underline text-blue-500">{title}</span>
        </h4>
      </a>
      <a href={`/k/${props.ownerFingerprint}`}>
        posted by {props.ownerName}
        {" on "}
        {new Date(props.timestamp).toLocaleString()}
      </a>
    </div>
  );
}
