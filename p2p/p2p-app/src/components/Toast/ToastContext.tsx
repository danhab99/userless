import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type ToastButton = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: number;
  message: string;
  buttons?: ToastButton[];
  /** Auto-dismiss after ms. 0 = no auto-dismiss. Default: 5000 */
  duration?: number;
  variant?: "default" | "error" | "success" | "warning";
};

type AddToastOptions = Omit<Toast, "id">;

type ToastContextValue = {
  toasts: Toast[];
  addToast: (options: AddToastOptions) => number;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => 0,
  dismissToast: () => {},
});

let nextId = 1;

export function ToastProvider(props: React.PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (options: AddToastOptions): number => {
      const id = nextId++;
      const duration = options.duration ?? 5000;
      const toast: Toast = { ...options, id, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {props.children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
