import { useEffect } from 'react';
import { useUiStore, type ToastItem } from '@/app/store/uiStore';

const TYPE_CLASS: Record<ToastItem['type'], string> = {
  success: 'bg-success-100 text-success-500 border-success-500/30',
  error: 'bg-error-100 text-error-500 border-error-500/30',
  warning: 'bg-warning-100 text-warning-500 border-warning-500/40',
  info: 'bg-neutral-100 text-neutral-700 border-neutral-300',
};

const TYPE_ICON: Record<ToastItem['type'], string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

function ToastView({ toast }: { toast: ToastItem }): React.ReactElement {
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast.id, toast.durationMs, removeToast]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-md ${TYPE_CLASS[toast.type]}`}
    >
      <span aria-hidden="true">{TYPE_ICON[toast.type]}</span>
      <span className="text-sm">{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="ml-2 text-xs opacity-60 hover:opacity-100"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer(): React.ReactElement {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </div>
  );
}
