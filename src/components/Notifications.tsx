import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal } from './Modal';

type Tone = 'success' | 'error' | 'info';
type Notice = { id: number; message: string; tone: Tone };
type Confirmation = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
};
type PendingConfirmation = Confirmation & {
  resolve: (confirmed: boolean) => void;
};
type Notifications = {
  notify: (message: string, tone?: Tone) => void;
  confirm: (options: Confirmation) => Promise<boolean>;
};
const Context = createContext<Notifications | null>(null);

function Toast({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || notice.tone === 'error') return;
    const timer = window.setTimeout(() => onDismiss(notice.id), 7000);
    return () => window.clearTimeout(timer);
  }, [notice, onDismiss, paused]);
  const Icon =
    notice.tone === 'success'
      ? CheckCircle2
      : notice.tone === 'error'
        ? AlertCircle
        : Info;
  return (
    <div
      className={`app-toast toast-${notice.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <Icon size={21} className="toast-icon" />
      <div
        role={notice.tone === 'error' ? 'alert' : 'status'}
        aria-atomic="true"
      >
        <strong>
          {notice.tone === 'success'
            ? 'All done'
            : notice.tone === 'error'
              ? 'Something needs attention'
              : 'Good to know'}
        </strong>
        <p>{notice.message}</p>
      </div>
      <button
        type="button"
        className="toast-dismiss"
        onClick={() => onDismiss(notice.id)}
        aria-label="Dismiss notification"
      >
        <X size={17} />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const queue = useRef<PendingConfirmation[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback(
    (id: number) =>
      setNotices((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback((message: string, tone: Tone = 'info') => {
    if (!message.trim()) return;
    const id = ++nextId.current;
    setNotices((items) =>
      [
        ...items.filter(
          (item) => item.message !== message || item.tone !== tone,
        ),
        { id, message, tone },
      ].slice(-5),
    );
  }, []);
  const confirm = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((resolve) => {
        const item = { ...options, resolve };
        queue.current.push(item);
        if (queue.current.length === 1) setPending(item);
      }),
    [],
  );
  const settle = useCallback((confirmed: boolean) => {
    const item = queue.current.shift();
    item?.resolve(confirmed);
    setPending(queue.current[0] ?? null);
  }, []);
  useEffect(
    () => () => {
      for (const item of queue.current.splice(0)) item.resolve(false);
    },
    [],
  );
  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);
  return (
    <Context.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-label="Notifications">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} onDismiss={dismiss} />
        ))}
      </div>
      {pending && (
        <Modal label={pending.title} onClose={() => settle(false)}>
          <div
            className={`confirmation-dialog confirmation-${pending.tone ?? 'primary'}`}
          >
            <div className="confirmation-symbol">
              {pending.tone === 'danger' || pending.tone === 'warning' ? (
                <AlertTriangle size={26} />
              ) : (
                <Info size={26} />
              )}
            </div>
            <h2>{pending.title}</h2>
            <p>{pending.message}</p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="button"
                onClick={() => settle(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button ${pending.tone === 'danger' ? 'button-danger' : 'button-primary'}`}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Continue'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}

export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('Notifications require NotificationProvider.');
  return value;
}

export function useFeedback(tone: Tone) {
  const [message, setMessage] = useState<string | null>(null);
  const { notify } = useNotifications();
  const update = useCallback(
    (value: string | null) => {
      const message =
        value?.replace(
          /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/,
          '',
        ) ?? null;
      setMessage(message);
      if (
        message &&
        (tone !== 'error' || !document.querySelector('dialog[open]'))
      )
        notify(message, tone);
    },
    [notify, tone],
  );
  return [message, update] as const;
}

export function InlineNotice({
  message,
  tone = 'error',
  onDismiss,
}: {
  message: string;
  tone?: Tone;
  onDismiss?: () => void;
}) {
  const Icon =
    tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div
      className={`inline-notice toast-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={19} />
      <p>{message}</p>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss message"
          className="toast-dismiss"
          onClick={onDismiss}
        >
          <X size={17} />
        </button>
      )}
    </div>
  );
}
