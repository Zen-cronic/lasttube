// Provider-status honesty made visible. Never color-only: the label always
// carries the status word.

export type BadgeStatus = 'live' | 'fixture' | 'unavailable' | 'failed' | 'configured';

export function ProviderStatusBadge({ name, status }: { name: string; status: BadgeStatus }) {
  return (
    <span className={`badge badge-${status}`} role="status">
      {name}: {status}
    </span>
  );
}
