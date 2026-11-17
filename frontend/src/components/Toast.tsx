export interface ToastMessage {
  kind: "info" | "success" | "error";
  message: string;
  link?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <span>
        {toast.message}
        {toast.link && (
          <>
            {" "}
            <a href={toast.link} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </>
        )}
      </span>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
