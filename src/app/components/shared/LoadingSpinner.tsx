interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ size = 'md', label }: Props): React.ReactElement {
  return (
    <div className="inline-flex items-center gap-3" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className={`${SIZE_CLASS[size]} animate-spin rounded-full border-neutral-300 border-t-brand-500`}
      />
      {label ? <span className="text-sm text-neutral-700">{label}</span> : null}
    </div>
  );
}
