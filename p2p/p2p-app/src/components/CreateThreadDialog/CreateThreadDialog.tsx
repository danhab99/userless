import { useState } from "react";
import Markdown from "react-markdown";
import type { Userless } from "../../lib/userless";

type FileAttachment = {
  name: string;
  data: ArrayBuffer;
  hash?: string;
};

export type CreateThreadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated: () => void;
  userless: Userless;
};

export function CreateThreadDialog(props: CreateThreadDialogProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.currentTarget.files ?? []);
    processFiles(selectedFiles);
  };

  const processFiles = async (fileList: File[]) => {
    const newFiles: FileAttachment[] = [];

    for (const file of fileList) {
      const data = await file.arrayBuffer();
      newFiles.push({
        name: file.name,
        data,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addFileReference = (fileName: string, hash: string) => {
    const fileRef = `![${fileName}](userless://localhost/files/${hash})`;
    setContent((prev) => `${prev}\n\n${fileRef}`);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Thread content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      // Upload files first
      const uploadedFiles: Array<{ name: string; hash: string }> = [];

      for (const file of files) {
        const hash = await props.userless.addFile(file.name, file.data);
        uploadedFiles.push({ name: file.name, hash });
      }

      // Create a body with file references if any
      let body = content;
      if (uploadedFiles.length > 0) {
        const fileSection = uploadedFiles
          .map((f) => `![${f.name}](userless://localhost/files/${f.hash})`)
          .join("\n");
        body = `${content}\n\n## Files\n\n${fileSection}`;
      }

      // Create the thread
      await props.userless.createThread(body);

      setContent("");
      setFiles([]);
      props.onThreadCreated();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!props.isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => !isSubmitting && props.onClose()}
      />

      {/* Dialog */}
      <div className="fixed inset-4 z-50 flex flex-col rounded-lg border bg-white md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2">
        <div className="flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">Create Thread</h2>
          <button
            type="button"
            onClick={props.onClose}
            disabled={isSubmitting}
            className="rounded-md text-2xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tab buttons */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`flex-1 text-xs font-medium uppercase tracking-wider ${
                !preview ? "border-b-2" : ""
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`flex-1 text-xs font-medium uppercase tracking-wider ${
                preview ? "border-b-2" : ""
              }`}
            >
              Preview
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4">
            {!preview ? (
              <div className="space-y-4">
                {/* Textarea */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative rounded-lg border-2 transition-colors ${
                    dragActive ? "border-blue-400 bg-blue-50" : "border-dashed"
                  }`}
                >
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Write your thread in Markdown... (Drag files here to attach)"
                    className="h-64 w-full rounded-lg p-3 text-sm disabled:opacity-50"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider">
                    Attachments
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    disabled={isSubmitting}
                    className="w-full text-xs disabled:opacity-50"
                  />
                </div>

                {/* Error */}
                {error && <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">{error}</div>}

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Files to Upload ({files.length})
                    </h3>
                    <div className="space-y-1">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-md border bg-gray-50 p-2 text-xs"
                        >
                          <span>{file.name}</span>
                          <div className="flex gap-2">
                            {file.hash && (
                              <button
                                type="button"
                                onClick={() =>
                                  addFileReference(file.name, file.hash!)
                                }
                                className="rounded-md border px-2 py-1 text-[10px]"
                              >
                                Insert
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              disabled={isSubmitting}
                              className="rounded-md border border-red-300 px-2 py-1 text-[10px] text-red-600 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Preview */
              <div className="prose max-w-none rounded-lg border bg-gray-50 p-4">
                <Markdown>{content}</Markdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t p-4">
          <button
            type="button"
            onClick={props.onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-md border text-xs font-medium uppercase tracking-wider disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="flex-1 rounded-md border text-xs font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {isSubmitting ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </>
  );
}
