import {
  ThreadListItem,
  ThreadListItemProps,
} from "../ThreadListItem/ThreadListItem";
import { getThreadTitle } from "@/lib/getThreadTitle";
import Markdown from "react-markdown";
import { ThreadProps } from "@/lib/thread";

export type CommunityProps = ThreadProps & {
  threads: ThreadListItemProps[];
};

export function Community(props: CommunityProps) {
  const [title, sidebar] = getThreadTitle(props.body);

  return (
    <div>
      <h1 className="text-4xl underline pb-4">{title}</h1>
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
