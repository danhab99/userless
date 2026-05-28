import { useState } from "react";
import { createPortal } from "react-dom";
import { useUserless } from "../UserlessProvider/UserlessProvider";

export type EmergencyDialogProps = {
  threadHash: string;
  onClose: () => void;
};

export function EmergencyDialog(props: EmergencyDialogProps) {
  const { userless } = useUserless();
  const [reason, setReason] = useState("");
  const [suggestedAction, setSuggestedAction] = useState<"remove" | "hide">("hide");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    userless.broadcastEmergency({
      thread_hash: props.threadHash,
      reason,
      suggested_action: suggestedAction,
    });
    setSent(true);
    setTimeout(props.onClose, 1200);
  };

  return createPortal(
    <div className="base16-default-dark fixed inset-0 z-50 flex items-center justify-center bg-800 h-screen w-screen bg-opacity-80">
      <div className="bg-700 text-200 w-full max-w-md p-6" style={{ boxShadow: "0 0 0 1px var(--color-500)" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-red font-bold text-lg">Broadcast Emergency</h2>
          <button onClick={props.onClose} className="text-400 hover:text-100">✕</button>
        </div>

        {sent ? (
          <p className="text-green py-4 text-center">Emergency broadcast sent.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-400 text-sm break-all">
              Thread: <span className="text-300">{props.threadHash}</span>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-400 uppercase text-xs">Reason</span>
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-800 text-200 border p-2 resize-none"
                style={{ borderColor: "var(--color-500)" }}
                placeholder="Describe why this content needs attention..."
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-400 uppercase text-xs">Suggested Action</span>
              <select
                value={suggestedAction}
                onChange={(e) => setSuggestedAction(e.target.value as "remove" | "hide")}
                className="bg-800 text-200 p-2"
                style={{ border: "1px solid var(--color-500)" }}
              >
                <option value="hide">Hide</option>
                <option value="remove">Remove</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="px-4 py-1 text-400 hover:text-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-red text-800 font-bold hover:opacity-90"
              >
                Broadcast
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
