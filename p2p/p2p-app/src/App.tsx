import { useState } from "react";
import Markdown from "react-markdown";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { UserlessSidebar } from "./components/Sidebar/UserlessSidebar";
import { useUserless } from "./components/UserlessProvider/UserlessProvider";
import type { ResolvedThread } from "./lib/userless";

function App() {
  const context = useUserless();
  const [selectedThread, setSelectedThread] = useState<ResolvedThread | undefined>(
    undefined,
  );

  return (
    <main className="flex h-screen flex-col bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-600">
        Userless P2P
      </header>

      <div className="grid grow grid-cols-[22rem_1fr] overflow-hidden">
        <aside className="overflow-y-auto border-r border-stone-300 bg-white p-3">
          <UserlessSidebar
            selectedHash={selectedThread?.hash}
            onSelectThread={setSelectedThread}
          />
        </aside>

        <section className="overflow-y-auto p-6">
          {selectedThread ? (
            <article className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-stone-300 bg-white p-6 shadow-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {selectedThread.owner.name}
                  {selectedThread.owner.email
                    ? ` <${selectedThread.owner.email}>`
                    : ""}
                </div>
                <h1 className="mt-2 text-lg font-semibold text-stone-800">
                  {selectedThread.hash}
                </h1>
              </div>

              <div className="prose max-w-none prose-stone">
                <Markdown>{selectedThread.body}</Markdown>
              </div>
            </article>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
              No threads discovered yet.
            </div>
          )}
        </section>
      </div>

      <StatusBar 
        connectionCount={context?.snapshot.connectionCount ?? 0}
        downloadSpeed={context?.snapshot.downloadSpeed ?? 0}
        fileCount={context?.snapshot.fileCount ?? 0}
        keyCount={context?.snapshot.keyCount ?? 0}
        threadCount={context?.snapshot.threadCount ?? 0}
        uploadSpeed={context?.snapshot.uploadSpeed ?? 0}
      />
    </main>
  );
}

export default App;
