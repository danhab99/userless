import { ThreadProvider } from "./components/contexts/thread_context";
import { CreateThread } from "./components/CreateThread/CreateThread";
import { UserlessStatusBar } from "./components/StatusBar/UserlessStatusBar";
import { UserlessProvider } from "./components/UserlessProvider/UserlessProvider";
import { P2PKeyContextProvider } from "./components/KeyContextProvider/P2PKeyContextProvider";
import { Navbar, type Page } from "./components/Navbar/Navbar";
import { useState } from "react";
import { ThreadPage } from "./components/ThreadPage/ThreadPage";
import { KeyManagementPage } from "./components/KeyManagement/KeyManagementPage";

function App() {
  const s = useState<Page>("threads");
  const [page] = s;

  return (
    <UserlessProvider>
      <P2PKeyContextProvider>
        <ThreadProvider>
          <main className="h-screen flex flex-col">
            <Navbar s={s} />
            <div className="flex-1 min-h-0">
              {page === "threads" ? <ThreadPage /> : null}
              {page === "keys" ? <KeyManagementPage /> : null}
            </div>
            <UserlessStatusBar />
          </main>
        </ThreadProvider>
      </P2PKeyContextProvider>
    </UserlessProvider>
  );
}

export default App;
