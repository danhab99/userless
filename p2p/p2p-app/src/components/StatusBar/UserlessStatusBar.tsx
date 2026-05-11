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

  const dt = curr.timestamp.getTime() - (prev?.timestamp.getTime() ?? 0);

  return (
    <StatusBar
      connectionCount={curr.snapshot.connectionCount}
      fileCount={curr.snapshot.fileCount}
      keyCount={curr.snapshot.keyCount}
      threadCount={curr.snapshot.threadCount}
      uploadSpeed={
        ((curr.snapshot.uploadedBytes || 0) -
          (prev?.snapshot.uploadedBytes ?? 0)) /
        dt
      }
      downloadSpeed={
        ((curr.snapshot.downloadedBytes || 0) -
          (prev?.snapshot.downloadedBytes ?? 0)) /
        dt
      }
      fileCountSpeed={
        ((curr.snapshot.fileCount || 0) - (prev?.snapshot.fileCount ?? 0)) / dt
      }
      keyCountSpeed={
        ((curr.snapshot.keyCount || 0) - (prev?.snapshot.keyCount ?? 0)) / dt
      }
      threadCountSpeed={
        ((curr.snapshot.threadCount || 0) - (prev?.snapshot.threadCount ?? 0)) /
        dt
      }
    />
  );
}
