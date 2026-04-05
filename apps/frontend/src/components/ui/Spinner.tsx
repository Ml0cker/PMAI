export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-border border-t-accent-green h-6 w-6 ${className}`} />
  );
}
