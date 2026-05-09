interface ErrorCardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface Props {
  title?: string;
  message: string;
  detail?: string;
  actions?: ErrorCardAction[];
}

export function ErrorCard({
  title = '出现错误',
  message,
  detail,
  actions = [],
}: Props): React.ReactElement {
  return (
    <div className="rounded-xl border border-error-100 bg-error-100/50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden="true">⚠️</span>
        <h4 className="text-base font-semibold text-error-500">{title}</h4>
      </div>
      <p className="mb-2 text-sm text-neutral-700">{message}</p>
      {detail ? (
        <pre className="mb-3 overflow-x-auto rounded-md bg-neutral-0 p-2 text-xs text-neutral-700">
          {detail}
        </pre>
      ) : null}
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={
                a.variant === 'primary'
                  ? 'rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600'
                  : 'rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50'
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
