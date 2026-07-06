import { useEffect } from "react";

export interface ToastData {
  id: string;
  message: string;
  onUndo?: () => void;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.onUndo && (
        <button
          className="toast-undo"
          onClick={() => {
            toast.onUndo?.();
            onDismiss();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
