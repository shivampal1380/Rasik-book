export function Spinner({ size = 'md', className = '' }) {
  const px = size === 'lg' ? 'h-10 w-10 border-4' : size === 'sm' ? 'h-4 w-4 border-2' : 'h-6 w-6 border-[3px]';
  return <span className={`inline-block animate-spin rounded-full border-slate-300 border-t-brand-700 dark:border-slate-600 dark:border-t-brand-400 ${px} ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  );
}