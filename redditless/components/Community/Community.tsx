import clsx from "clsx";
import style from "./Community.module.css";
import { ThreadProps } from "../Thread/Thread";
import {
  ThreadListItem,
  ThreadListItemProps,
} from "../ThreadListItem/ThreadListItem";
import { getThreadTitle } from "@/lib/getThreadTitle";
import Markdown from "react-markdown";

export type CommunityProps = {
  ownerEmail: string;
  ownerName: string;
  timestamp: number;
  body: string;
  hash: string;

  threads: ThreadListItemProps[];
};

export function Community(props: CommunityProps) {
  const [title, sidebar] = getThreadTitle(props.body);

  return (
    <div>
      <h1>{title}</h1>
      <div className="flex flex-row">
        <div className="w-4/5">
          {props.threads.map((props) => (
            <ThreadListItem {...props} />
          ))}
        </div>

        <div className="w-1/5">
          <Markdown>{sidebar}</Markdown>
        </div>
      </div>
    </div>
  );
}
