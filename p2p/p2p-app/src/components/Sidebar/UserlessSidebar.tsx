import { useCallback, useEffect, useState } from "react";
import type { ResolvedThread } from "../../lib/userless";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { Sidebar } from "./Sidebar";

export type UserlessSidebarProps = {};

const PAGE_SIZE = 100;

export function UserlessSidebar(props: UserlessSidebarProps) {
  const { userless } = useUserless();
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
    setVisibleState({
      cursor: undefined,
      threadHashes: [],
    });
    loadMore();
  }, [loadMore]);

  return (
    <Sidebar
      items={visibleState.threadHashes.map((threadHash) => ({ threadHash }))}
      onNext={loadMore}
      hasMore={!!visibleState.cursor}
    />
  );
}
