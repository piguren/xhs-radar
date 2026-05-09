import { useUiStore, type ToastItem } from '@/app/store/uiStore';

interface ToastInput {
  type: ToastItem['type'];
  message: string;
  durationMs?: number;
}

export function useToast(): (toast: ToastInput) => string {
  const addToast = useUiStore((s) => s.addToast);
  return (t) => addToast({ ...t, durationMs: t.durationMs ?? 3000 });
}
