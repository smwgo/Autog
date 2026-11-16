export function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-3 border-zinc-200 dark:border-zinc-800 border-t-blue-600 animate-spin" />
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
          Cargando...
        </p>
      </div>
    </div>
  );
}
