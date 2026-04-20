import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { UserlessSidebar } from "./components/Sidebar/UserlessSidebar";
import { useUserless } from "./components/UserlessProvider/UserlessProvider";
import type { ResolvedThread, PublicKeyDetail, FileDetail, AuditLogRecord } from "./lib/userless";

type PageType = "threads" | "keys" | "files" | "audit";

function App() {
  const context = useUserless();
  const [currentPage, setCurrentPage] = useState<PageType>("threads");
  const [selectedThread, setSelectedThread] = useState<ResolvedThread | undefined>(
    undefined,
  );
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState("");
  const [replyThreads, setReplyThreads] = useState<ResolvedThread[]>([]);
  const [replySaving, setReplySaving] = useState(false);
  const [replyNotice, setReplyNotice] = useState<string | undefined>(undefined);
  
  const [publicKeys, setPublicKeys] = useState<PublicKeyDetail[]>([]);
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | undefined>(undefined);
  const [selectedKeyThreads, setSelectedKeyThreads] = useState<ResolvedThread[]>([]);
  
  const [files, setFiles] = useState<FileDetail[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRecord[]>([]);

  const selectedHash = selectedThread?.hash;
  const selectedIsBookmarked = useMemo(
    () => (selectedHash ? bookmarks.has(selectedHash) : false),
    [bookmarks, selectedHash],
  );

  useEffect(() => {
    if (!context) {
      return;
    }

    void context.userless.getBookmarks().then((items) => {
      setBookmarks(new Set(items.map((item) => item.hash)));
    });
  }, [context]);

  useEffect(() => {
    if (!context || !selectedHash) {
      setReplyThreads([]);
      return;
    }

    setReplyNotice(undefined);
    void context.userless.getReplyThreads(selectedHash).then((threads) => {
      setReplyThreads(threads);
    });
  }, [context, selectedHash]);

  useEffect(() => {
    if (!context || currentPage !== "keys") {
      return;
    }

    void context.userless.getAllPublicKeysDetailed().then((keys) => {
      setPublicKeys(keys);
    });
  }, [context, currentPage]);

  useEffect(() => {
    if (!context || !selectedFingerprint) {
      setSelectedKeyThreads([]);
      return;
    }

    void context.userless.getThreadsByPublicKey(selectedFingerprint).then((threads) => {
      setSelectedKeyThreads(threads);
    });
  }, [context, selectedFingerprint]);

  useEffect(() => {
    if (!context || currentPage !== "files") {
      return;
    }

    void context.userless.getAllFilesDetailed().then((fileList) => {
      setFiles(fileList);
    });
  }, [context, currentPage]);

  useEffect(() => {
    if (!context || currentPage !== "audit") {
      return;
    }

    void context.userless.getAuditLog().then((log) => {
      setAuditLog(log);
    });
  }, [context, currentPage]);

  const toggleBookmark = async () => {
    if (!context || !selectedHash) {
      return;
    }

    if (selectedIsBookmarked) {
      await context.userless.removeBookmark(selectedHash);
      setBookmarks((current) => {
        const next = new Set(current);
        next.delete(selectedHash);
        return next;
      });
      return;
    }

    await context.userless.addBookmark(selectedHash);
    setBookmarks((current) => {
      const next = new Set(current);
      next.add(selectedHash);
      return next;
    });
  };

  const saveReplyDraft = async () => {
    if (!context || !selectedHash || !replyText.trim()) {
      return;
    }

    setReplySaving(true);
    setReplyNotice(undefined);
    try {
      await context.userless.saveReplyDraft(selectedHash, replyText.trim());
      setReplyText("");
      setReplyNotice("Reply draft saved to the audit log.");
    } finally {
      setReplySaving(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-600">
        Userless P2P
      </header>

      <nav className="border-b border-stone-300 bg-stone-50 px-4 flex gap-1">
        <button
          type="button"
          onClick={() => setCurrentPage("threads")}
          className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
            currentPage === "threads"
              ? "border-b-2 border-stone-800 text-stone-800"
              : "text-stone-600 hover:text-stone-800"
          }`}
        >
          Threads
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("keys")}
          className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
            currentPage === "keys"
              ? "border-b-2 border-stone-800 text-stone-800"
              : "text-stone-600 hover:text-stone-800"
          }`}
        >
          Keys ({publicKeys.length})
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("files")}
          className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
            currentPage === "files"
              ? "border-b-2 border-stone-800 text-stone-800"
              : "text-stone-600 hover:text-stone-800"
          }`}
        >
          Files ({files.length})
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("audit")}
          className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
            currentPage === "audit"
              ? "border-b-2 border-stone-800 text-stone-800"
              : "text-stone-600 hover:text-stone-800"
          }`}
        >
          Audit
        </button>
      </nav>

      {currentPage === "threads" && (
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
                  <button
                    type="button"
                    className="mt-3 rounded-md border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                    onClick={toggleBookmark}
                  >
                    {selectedIsBookmarked ? "Remove bookmark" : "Add bookmark"}
                  </button>
                </div>

                <div className="prose max-w-none prose-stone">
                  <Markdown>{selectedThread.body}</Markdown>
                </div>

                <section className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <h2 className="text-sm font-semibold text-stone-700">Compose Reply</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Include <code>reply_to: {selectedThread.hash}</code> in your thread body to link replies.
                  </p>
                  <textarea
                    className="mt-2 h-28 w-full rounded-md border border-stone-300 bg-white p-2 text-sm"
                    placeholder={`reply_to: ${selectedThread.hash}\n\nYour reply...`}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={replySaving || !replyText.trim()}
                      className="rounded-md bg-stone-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                      onClick={saveReplyDraft}
                    >
                      {replySaving ? "Saving..." : "Save Reply Draft"}
                    </button>
                    {replyNotice ? <span className="text-xs text-stone-600">{replyNotice}</span> : null}
                  </div>
                </section>

                <section className="rounded-lg border border-stone-200 bg-white p-3">
                  <h2 className="text-sm font-semibold text-stone-700">Replies</h2>
                  {replyThreads.length === 0 ? (
                    <p className="mt-2 text-xs text-stone-500">No replies discovered yet.</p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {replyThreads.map((reply) => (
                        <button
                          key={reply.hash}
                          type="button"
                          className="w-full rounded-md border border-stone-200 bg-stone-50 p-3 text-left hover:bg-stone-100"
                          onClick={() => setSelectedThread(reply)}
                        >
                          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                            {reply.owner.name} {reply.owner.email ? `<${reply.owner.email}>` : ""}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-stone-700">{reply.hash}</div>
                          <div className="mt-2 line-clamp-3 text-xs text-stone-600">{reply.body}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </article>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                No threads discovered yet.
              </div>
            )}
          </section>
        </div>
      )}

      {currentPage === "keys" && (
        <div className="grid grow grid-cols-[22rem_1fr] overflow-hidden">
          <aside className="overflow-y-auto border-r border-stone-300 bg-white p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Public Keys</h2>
            <div className="mt-3 space-y-2">
              {publicKeys.length === 0 ? (
                <p className="text-xs text-stone-500">No public keys discovered.</p>
              ) : (
                publicKeys.map((key) => (
                  <button
                    key={key.fingerprint}
                    type="button"
                    onClick={() => setSelectedFingerprint(key.fingerprint)}
                    className={`w-full rounded-md border p-2 text-left text-xs ${
                      selectedFingerprint === key.fingerprint
                        ? "border-stone-400 bg-stone-100"
                        : "border-stone-200 bg-stone-50 hover:bg-stone-100"
                    }`}
                  >
                    <div className="font-mono text-[10px] text-stone-600">{key.fingerprint.slice(0, 16)}</div>
                    <div className="mt-1 text-xs text-stone-700">{key.userId || "(no user ID)"}</div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="overflow-y-auto p-6">
            {selectedFingerprint ? (
              <div className="mx-auto max-w-3xl">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-stone-800">Threads Signed by Key</h2>
                  <p className="mt-1 text-xs text-stone-600">{selectedFingerprint}</p>
                </div>
                {selectedKeyThreads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
                    No threads found signed by this key.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedKeyThreads.map((thread) => (
                      <button
                        key={thread.hash}
                        type="button"
                        onClick={() => {
                          setCurrentPage("threads");
                          setSelectedThread(thread);
                        }}
                        className="w-full rounded-md border border-stone-200 bg-white p-4 text-left hover:bg-stone-50"
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{thread.owner.name}</div>
                        <div className="mt-2 font-mono text-xs text-stone-600">{thread.hash}</div>
                        <div className="mt-2 line-clamp-2 text-sm text-stone-700">{thread.body}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                Select a public key to view threads.
              </div>
            )}
          </section>
        </div>
      )}

      {currentPage === "files" && (
        <section className="overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-semibold text-stone-800">Downloaded Files</h2>
            <p className="mt-1 text-xs text-stone-600">Files cached from peer threads</p>
            {files.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
                No files downloaded yet.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-stone-300">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 border-b border-stone-300">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-stone-700">Hash</th>
                      <th className="px-4 py-2 text-right font-semibold text-stone-700">Size</th>
                      <th className="px-4 py-2 text-left font-semibold text-stone-700">Source Thread</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {files.map((file) => (
                      <tr key={file.hash} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono text-stone-600">{file.hash.slice(0, 16)}</td>
                        <td className="px-4 py-3 text-right text-stone-600">{(file.size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-stone-500">{file.sourceThreadHash?.slice(0, 16) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {currentPage === "audit" && (
        <section className="overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-semibold text-stone-800">Audit Log</h2>
            <p className="mt-1 text-xs text-stone-600">System events and peer activity</p>
            {auditLog.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
                No events recorded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {auditLog
                  .slice()
                  .reverse()
                  .map((entry, idx) => {
                    const isEmergency = entry.event === "emergency";
                    return (
                      <div
                        key={idx}
                        className={`rounded-md border p-3 text-xs ${
                          isEmergency
                            ? "border-red-300 bg-red-50"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`font-semibold ${isEmergency ? "text-red-700" : "text-stone-700"}`}>
                              {entry.event}
                            </span>
                            <span className="ml-2 text-stone-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {entry.details && (
                          <div className="mt-1 font-mono text-[10px] text-stone-600 break-all">
                            {entry.details.length > 100 ? `${entry.details.slice(0, 100)}…` : entry.details}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      )}

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
