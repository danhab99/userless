import { ThreadProvider } from "./components/contexts/thread_context";
import { CreateThread } from "./components/CreateThread/CreateThread";
import { UserlessMarkdownBody } from "./components/MarkdownBody/UserlessMarkdownBody";
import { UserlessSidebar } from "./components/Sidebar/UserlessSidebar";
import { UserlessStatusBar } from "./components/StatusBar/UserlessStatusBar";
import { UserlessProvider } from "./components/UserlessProvider/UserlessProvider";

type PageType = "threads" | "keys" | "files";

function App() {
  return (
    <UserlessProvider>
      <ThreadProvider>
        <main className="h-screen">
          <div className="h-full">
            <UserlessSidebar />
            <UserlessMarkdownBody />
          </div>
          <div className="bottom-0 absolute w-full">
            <UserlessStatusBar />
          </div>
        </main>
        <CreateThread />
      </ThreadProvider>
    </UserlessProvider>
  );
}

export default App;
