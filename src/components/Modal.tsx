import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({
  children,
  label,
  onClose,
  busy = false,
  error,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="app-modal"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {error && (
        <div className="inline-notice toast-error" role="alert">
          <AlertCircle size={19} />
          <p>{error}</p>
        </div>
      )}
      {children}
    </dialog>
  );
}
