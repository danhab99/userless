import { ThreadListItem } from "../ThreadListItem/ThreadListItem";
import type { ThreadListItemProps } from "../ThreadListItem/ThreadListItem";

export interface ThreadListProps {
  threads: ThreadListItemProps[];
}

export function ThreadList(props: ThreadListProps) {
  return (
    <div className="grid gap-4">
      {props.threads.map((thread, index) => (
        <ThreadListItem key={index} {...thread} />
      ))}
    </div>
  );
}
