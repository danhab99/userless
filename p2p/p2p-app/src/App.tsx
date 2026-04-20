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
    <main className="flex h-screen flex-col">
      <header className="border-b text-sm font-semibold uppercase tracking-[0.2em]">
        Userless P2P
      </header>

      <nav className="border-b flex gap-1">
        <button
          type="button"
          onClick={() => setCurrentPage("threads")}
          className={`text-xs font-medium uppercase tracking-wider ${
            currentPage === "threads"
              ? "border-b-2"
              : ""
          }`}
        >
          Threads
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("keys")}
          className={`text-xs font-medium uppercase tracking-wider ${
            currentPage === "keys"
              ? "border-b-2"
              : ""
          }`}
        >
          Keys ({publicKeys.length})
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("files")}
          className={`text-xs font-medium uppercase tracking-wider ${
            currentPage === "files"
              ? "border-b-2"
              : ""
          }`}
        >
          Files ({files.length})
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("audit")}
          className={`text-xs font-medium uppercase tracking-wider ${
            currentPage === "audit"
              ? "border-b-2"
              : ""
          }`}
        >
          Audit
        </button>
      </nav>

      {currentPage === "threads" && (
        <div className="grid grow grid-cols-[22rem_1fr] overflow-hidden">
          <aside className="overflow-y-auto border-r">
            <UserlessSidebar
              selectedHash={selectedThread?.hash}
              onSelectThread={setSelectedThread}
            />
          </aside>

          <section className="overflow-y-auto">
            {selectedThread ? (
              <article className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border">
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
                    className="mt-3 rounded-md border text-xs font-medium"
                    onClick={toggleBookmark}
                  >
                    {selectedIsBookmarked ? "Remove bookmark" : "Add bookmark"}
                  </button>
                </div>

                  <div className="prose max-w-none">
                  <Markdown>{selectedThread.body}</Markdown>
                </div>

                <section className="rounded-lg border">
                  <h2 className="text-sm font-semibold">Compose Reply</h2>
                  <p className="mt-1 text-xs">
                    Include <code>reply_to: {selectedThread.hash}</code> in your thread body to link replies.
                  </p>
                  <textarea
                    className="mt-2 h-28 w-full rounded-md border text-sm"
                    placeholder={`reply_to: ${selectedThread.hash}\n\nYour reply...`}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={replySaving || !replyText.trim()}
                      className="rounded-md text-xs font-medium disabled:opacity-50"
                      onClick={saveReplyDraft}
                    >
                      {replySaving ? "Saving..." : "Save Reply Draft"}
                    </button>
                    {replyNotice ? <span className="text-xs">{replyNotice}</span> : null}
                  </div>
                </section>

                <section className="rounded-lg border">
                  <h2 className="text-sm font-semibold">Replies</h2>
                  {replyThreads.length === 0 ? (
                    <p className="mt-2 text-xs">No replies discovered yet.</p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {replyThreads.map((reply) => (
                        <button
                          key={reply.hash}
                          type="button"
                          className="w-full rounded-md border text-left"
                          onClick={() => setSelectedThread(reply)}
                        >
                          <div className="text-[10px] uppercase tracking-[0.18em]">
                            {reply.owner.name} {reply.owner.email ? `<${reply.owner.email}>` : ""}
                          </div>
                          <div className="mt-1 text-xs font-semibold">{reply.hash}</div>
                          <div className="mt-2 line-clamp-3 text-xs">{reply.body}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </article>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm">
                No threads discovered yet.
              </div>
            )}
          </section>
        </div>
      )}

      {currentPage === "keys" && (
        <div className="grid grow grid-cols-[22rem_1fr] overflow-hidden">
          <aside className="overflow-y-auto border-r">
            <h2 className="text-xs font-semibold uppercase tracking-wider">Public Keys</h2>
            <div className="mt-3 space-y-2">
              {publicKeys.length === 0 ? (
                <p className="text-xs">No public keys discovered.</p>
              ) : (
                publicKeys.map((key) => (
                  <button
                    key={key.fingerprint}
                    type="button"
                    onClick={() => setSelectedFingerprint(key.fingerprint)}
                    className={`w-full rounded-md border text-left text-xs
                    `}
                  >
                    <div className="font-mono text-[10px]">{key.fingerprint.slice(0, 16)}</div>
                    <div className="mt-1 text-xs">{key.userId || "(no user ID)"}</div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="overflow-y-auto">
            {selectedFingerprint ? (
              <div className="mx-auto max-w-3xl">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Threads Signed by Key</h2>
                  <p className="mt-1 text-xs">{selectedFingerprint}</p>
                </div>
                {selectedKeyThreads.length === 0 ? (
                  <div className="rounded-xl border border-dashed text-center text-sm">
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
                        className="w-full rounded-md border text-left"
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em]">{thread.owner.name}</div>
                        <div className="mt-2 font-mono text-xs">{thread.hash}</div>
                        <div className="mt-2 line-clamp-2 text-sm">{thread.body}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm">
                Select a public key to view threads.
              </div>
            )}
          </section>
        </div>
      )}

      {currentPage === "files" && (
        <section className="overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-semibold">Downloaded Files</h2>
            <p className="mt-1 text-xs">Files cached from peer threads</p>
            {files.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed text-center text-sm">
                No files downloaded yet.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left font-semibold">Hash</th>
                      <th className="text-right font-semibold">Size</th>
                      <th className="text-left font-semibold">Source Thread</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {files.map((file) => (
                      <tr key={file.hash}>
                        <td className="font-mono">{file.hash.slice(0, 16)}</td>
                        <td className="text-right">{(file.size / 1024).toFixed(1)} KB</td>
                        <td className="font-mono text-[10px]">{file.sourceThreadHash?.slice(0, 16) ?? "—"}</td>
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
        <section className="overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <p className="mt-1 text-xs">System events and peer activity</p>
            {auditLog.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed text-center text-sm">
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
                        className={`rounded-md border text-xs ${
                          isEmergency
                            ? "border-red-300"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`font-semibold ${isEmergency ? "text-red-700" : ""}`}>
                              {entry.event}
                            </span>
                            <span className="ml-2">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {entry.details && (
                          <div className="mt-1 font-mono text-[10px] break-all">
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
