import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { UserlessSidebar } from "./components/Sidebar/UserlessSidebar";
import { useUserless } from "./components/UserlessProvider/UserlessProvider";
import { CreateThreadDialog } from "./components/CreateThreadDialog/CreateThreadDialog";
import { CreateThreadButton } from "./components/CreateThreadButton/CreateThreadButton";
import type { ResolvedThread, PublicKeyDetail, FileDetail } from "./lib/userless";
import {ThreadView} from "./components/ThreadView/ThreadView";
import {UserlessStatusBar} from "./components/StatusBar/UserlessStatusBar";

type PageType = "threads" | "keys" | "files";

function App() {
  return (
    <main >
      <UserlessStatusBar />
    </main>
  );
}

export default App;
