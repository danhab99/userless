import { useEffect, useState } from "react";
import {
  EMPTY_SNAPSHOT,
  useUserless,
} from "../UserlessProvider/UserlessProvider";
import { type UserlessSnapshot } from "../../lib/userless";
import { usePrevious } from "react-use";
import { StatusBar } from "./StatusBar";

export function UserlessStatusBar(props: {}) {
  const { userless } = useUserless();
  const [curr, setSnapshot] = useState<{
    snapshot: UserlessSnapshot;
    timestamp: Date;
  }>({
    snapshot: EMPTY_SNAPSHOT,
    timestamp: new Date(),
  });
  const prev = usePrevious(curr);

  useEffect(() => {
    const id = setInterval(async () => {
      const snapshot = await userless.getSnapshot();

      setSnapshot({
        timestamp: new Date(),
        snapshot,
      });
    }, 100);

    return () => {
      clearInterval(id);
    };
  }, [userless]);

  return (
    <StatusBar
      connectionCount={curr.snapshot.connectionCount}
      fileCount={curr.snapshot.fileCount}
      keyCount={curr.snapshot.keyCount}
      threadCount={curr.snapshot.threadCount}
      uploadSpeed={
        (curr.snapshot.uploadedBytes - (prev?.snapshot.uploadedBytes ?? 0)) /
        (curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0))
      }
      downloadSpeed={
        (curr.snapshot.downloadedBytes -
          (prev?.snapshot.downloadedBytes ?? 0)) /
        (curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0))
      }
      fileCountSpeed={
        (curr.snapshot.fileCount - (prev?.snapshot.fileCount ?? 0)) /
        (curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0))
      }
      keyCountSpeed={
        (curr.snapshot.keyCount - (prev?.snapshot.keyCount ?? 0)) /
        (curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0))
      }
      threadCountSpeed={
        (curr.snapshot.threadCount - (prev?.snapshot.threadCount ?? 0)) /
        (curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0))
      }
    />
  );
}
