export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-5 w-12 rounded-full bg-white/10" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/10" />
          </div>
          <div className="h-6 w-6 rounded bg-white/10" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/10" />
          </div>
          <div className="h-6 w-6 rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-3 w-20 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function MatchGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}
