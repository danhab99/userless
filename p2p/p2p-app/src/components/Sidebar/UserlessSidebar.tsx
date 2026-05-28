import { useCallback, useEffect, useState } from "react";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { Sidebar } from "./Sidebar";

export type UserlessSidebarProps = {
  width?: number;
};

const PAGE_SIZE = 100;

export function UserlessSidebar(props: UserlessSidebarProps) {
  const { userless } = useUserless();
  const [isRescanning, setIsRescanning] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleState, setVisibleState] = useState<{
    threadHashes: string[];
    cursor: string | undefined;
  }>({
    cursor: undefined,
    threadHashes: [],
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const rootThreads = await userless.getAllThreads(
        visibleState.cursor,
        PAGE_SIZE,
      );

      setVisibleState((prev) => {
        const nextHashes = new Set(prev.threadHashes);
        for (const thread of rootThreads.items) {
          nextHashes.add(thread.hash);
        }

        return {
          cursor: rootThreads.next_cursor,
          threadHashes: Array.from(nextHashes),
        };
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, userless, visibleState.cursor]);

  useEffect(() => {
    const reset = () => {
      setVisibleState({
        cursor: undefined,
        threadHashes: [],
      });
      void loadMore();
    };

    const offCreated = userless.on("thread_created", () => {
      reset();
    });

    const offHidden = userless.on("thread_hidden", () => {
      reset();
    });

    reset();

    return () => {
      offCreated();
      offHidden();
    };
  }, [loadMore, userless]);

  const handleRescanAllPeers = useCallback(async () => {
    setIsRescanning(true);
    try {
      await userless.scanAllPeers();
      setVisibleState({
        cursor: undefined,
        threadHashes: [],
      });
      void loadMore();
    } finally {
      setIsRescanning(false);
    }
  }, [loadMore, userless]);

  return (
    <Sidebar
      width={props.width}
      items={visibleState.threadHashes.map((threadHash) => ({ threadHash }))}
      onNext={loadMore}
      hasMore={!!visibleState.cursor}
      onRescanAllPeers={handleRescanAllPeers}
      isRescanning={isRescanning}
    />
  );
}
