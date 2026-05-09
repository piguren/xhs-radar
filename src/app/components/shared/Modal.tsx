import { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const MAX_WIDTH_CLASS: Record<NonNullable<Props['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  maxWidth = 'md',
}: Props): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'xhs-radar-modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`mx-4 w-full ${MAX_WIDTH_CLASS[maxWidth]} rounded-xl bg-white shadow-2xl`}
      >
        {title ? (
          <header className="border-b border-neutral-200 px-5 py-4">
            <h2 id="xhs-radar-modal-title" className="text-base font-semibold text-neutral-900">
              {title}
            </h2>
          </header>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
