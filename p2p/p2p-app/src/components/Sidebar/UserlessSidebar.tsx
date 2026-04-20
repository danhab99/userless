import { useEffect, useState } from "react";
import type { ResolvedThread } from "../../lib/userless";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { Sidebar } from "./Sidebar";

export type UserlessSidebarProps = {
  selectedHash?: string;
  onSelectThread: (thread: ResolvedThread) => void;
};

const PAGE_SIZE = 100;

export function UserlessSidebar(props: UserlessSidebarProps) {
  const context = useUserless();
  const [threads, setThreads] = useState<ResolvedThread[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setThreads([]);
    setHasMore(true);
    setCursor(undefined);
  }, [context?.userless]);

  useEffect(() => {
    if (!context || threads.length > 0 || !hasMore) {
      return;
    }

    void (async () => {
      const page = await context.userless.listResolvedThreads(undefined, PAGE_SIZE);
      setThreads(page.items);
      setHasMore(Boolean(page.next_cursor));
      setCursor(page.next_cursor);

      if (!props.selectedHash && page.items[0]) {
        props.onSelectThread(page.items[0]);
      }
    })();
  }, [context, hasMore, props, threads.length]);

  const loadNext = async () => {
    if (!context || !hasMore) {
      return;
    }

    const page = await context.userless.listResolvedThreads(cursor, PAGE_SIZE);
    setThreads((current) => [...current, ...page.items]);
    setHasMore(Boolean(page.next_cursor));
    setCursor(page.next_cursor);
  };

  return <Sidebar 
    items={threads.map(x => ({
      body: x.body,
      ownerEmail: x.owner.email,
      ownerName: x.owner.name,
      timestamp: new Date(),
      selected: x.hash === props.selectedHash,
      onClick: () => props.onSelectThread(x),
    }))}
    onNext={loadNext}
    hasMore={hasMore}
  />;
}
