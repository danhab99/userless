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

  useEffect(() => {
    setThreads([]);
    setHasMore(true);
  }, [context?.userless]);

  useEffect(() => {
    if (!context || threads.length > 0 || !hasMore) {
      return;
    }

    void (async () => {
      const nextThreads = await context.userless.listResolvedThreads(0, PAGE_SIZE);
      setThreads(nextThreads);
      setHasMore(nextThreads.length === PAGE_SIZE);

      if (!props.selectedHash && nextThreads[0]) {
        props.onSelectThread(nextThreads[0]);
      }
    })();
  }, [context, hasMore, props, threads.length]);

  const loadNext = async () => {
    if (!context || !hasMore) {
      return;
    }

    const nextThreads = await context.userless.listResolvedThreads(
      threads.length,
      PAGE_SIZE,
    );
    setThreads((current) => [...current, ...nextThreads]);
    setHasMore(nextThreads.length === PAGE_SIZE);
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
