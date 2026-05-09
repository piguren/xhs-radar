interface Props {
  emoji?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ emoji = '📭', title, description, action }: Props): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">{emoji}</div>
      <h3 className="mb-1 text-base font-semibold text-neutral-900">{title}</h3>
      {description ? <p className="mb-4 max-w-md text-sm text-neutral-500">{description}</p> : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
