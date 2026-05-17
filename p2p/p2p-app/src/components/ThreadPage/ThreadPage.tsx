import { CreateThread } from "../CreateThread/CreateThread";
import { UserlessMarkdownBody } from "../MarkdownBody/UserlessMarkdownBody";
import { UserlessSidebar } from "../Sidebar/UserlessSidebar";
import { useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type ThreadPageProps = {};

const SIDEBAR_WIDTH_STORAGE_KEY = "userless:p2p:sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 380;
const MIN_SIDEBAR_WIDTH = 260;

function clampSidebarWidth(width: number): number {
  const maxSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, window.innerWidth - 320);
  return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), maxSidebarWidth);
}

export function ThreadPage(props: ThreadPageProps) {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed)) {
      return clampSidebarWidth(parsed);
    }
    return clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const onWindowResize = () => {
      setSidebarWidth((previous) => clampSidebarWidth(previous));
    };

    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  const startResize = (startEvent: ReactPointerEvent<HTMLDivElement>) => {
    startEvent.preventDefault();

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (event: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(event.clientX));
    };

    const stopResize = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  return (
    <div className="h-full">
      <CreateThread />
      <div className="h-full flex flex-row">
        <UserlessSidebar width={sidebarWidth} />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="w-2 cursor-col-resize bg-700 hover:bg-600 active:bg-500 transition-colors"
          onPointerDown={startResize}
        />
        <div className="flex-1 min-w-0">
          <UserlessMarkdownBody />
        </div>
      </div>
    </div>
  );
}
