import { createPortal } from "react-dom";
import { useToast, type Toast } from "./ToastContext";

const variantStyles: Record<NonNullable<Toast["variant"]>, string> = {
  default: "border-500",
  error: "border-red",
  success: "border-green",
  warning: "border-yellow",
};

const variantAccent: Record<NonNullable<Toast["variant"]>, string> = {
  default: "text-200",
  error: "text-red",
  success: "text-green",
  warning: "text-yellow",
};

function ToastItem(props: { toast: Toast; onDismiss: () => void }) {
  const { toast, onDismiss } = props;
  const variant = toast.variant ?? "default";

  return (
    <div
      className={`bg-700 text-200 border-l-2 ${variantStyles[variant]} shadow-lg cursor-pointer w-80 p-3 flex flex-col gap-2`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
      onClick={onDismiss}
      role="alert"
    >
      <p className={`text-sm ${variantAccent[variant]}`}>{toast.message}</p>

      {toast.buttons && toast.buttons.length > 0 ? (
        <div
          className="flex gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {toast.buttons.map((btn, i) => (
            <button
              key={i}
              className="text-xs px-2 py-1 bg-600 hover:bg-500 text-200"
              onClick={(e) => {
                e.stopPropagation();
                btn.onClick();
                onDismiss();
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="base16-default-dark fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>,
    document.body,
  );
}
