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
  const [visibleState, setVisibleState] = useState<{
    threadHashes: string[];
    cursor: string | undefined;
  }>({
    cursor: undefined,
    threadHashes: [],
  });

  const loadMore = useCallback(() => {
    (async () => {
      let allThreadHashes = await userless.getAllThreads(
        visibleState.cursor,
        PAGE_SIZE,
      );

      setVisibleState((prev) => {
        return {
          cursor: allThreadHashes.next_cursor,
          threadHashes: [
            ...prev.threadHashes,
            ...allThreadHashes.items.filter(
              (x) => !prev.threadHashes.includes(x),
            ),
          ],
        };
      });
    })();
  }, [userless]);

  useEffect(() => {
    const reset = () => {
      setVisibleState({
        cursor: undefined,
        threadHashes: [],
      });
      loadMore();
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
      loadMore();
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
