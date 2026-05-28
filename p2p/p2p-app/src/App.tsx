import { ThreadProvider } from "./components/contexts/thread_context";
import { CreateThread } from "./components/CreateThread/CreateThread";
import { UserlessStatusBar } from "./components/StatusBar/UserlessStatusBar";
import { UserlessProvider } from "./components/UserlessProvider/UserlessProvider";
import { P2PKeyContextProvider } from "./components/KeyContextProvider/P2PKeyContextProvider";
import { Navbar, type Page } from "./components/Navbar/Navbar";
import { useEffect, useState } from "react";
import { ThreadPage } from "./components/ThreadPage/ThreadPage";
import { KeyManagementPage } from "./components/KeyManagement/KeyManagementPage";
import { ToastProvider, useToast } from "./components/Toast/ToastContext";
import { ToastContainer } from "./components/Toast/ToastContainer";
import { useUserless } from "./components/UserlessProvider/UserlessProvider";

function AppContent() {
  const s = useState<Page>("threads");
  const [page] = s;
  const { userless } = useUserless();
  const { addToast } = useToast();

  useEffect(() => {
    return userless.on("emergency", ({ payload }) => {
      const p = payload as {
        thread_hash?: string;
        reason?: string;
        suggested_action?: string;
      };
      addToast({
        variant: "error",
        message: `Emergency: ${p.reason ?? "no reason given"} (${p.suggested_action ?? "unknown action"})`,
        duration: 0,
        buttons: p.thread_hash
          ? [{ label: "View thread hash", onClick: () => navigator.clipboard.writeText(p.thread_hash!) }]
          : undefined,
      });
    });
  }, [userless, addToast]);

  return (
    <ThreadProvider>
      <main className="base16-default-dark h-screen flex flex-col bg-800 text-100">
        <Navbar s={s} />
        <div className="flex-1 min-h-0">
          {page === "threads" ? <ThreadPage /> : null}
          {page === "keys" ? <KeyManagementPage /> : null}
        </div>
        <UserlessStatusBar />
      </main>
      <ToastContainer />
    </ThreadProvider>
  );
}

function App() {
  return (
    <P2PKeyContextProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </P2PKeyContextProvider>
  );
}

export default App;
