import * as React from 'react';

export function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="h-4 w-24 rounded bg-neutral-800/80" />
            <div className="h-4 w-28 rounded bg-neutral-800/80" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-neutral-800/80" />
            <div className="h-4 w-11/12 rounded bg-neutral-800/80" />
            <div className="h-4 w-9/12 rounded bg-neutral-800/80" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-6 w-16 rounded-full bg-neutral-800/80" />
            <div className="h-6 w-20 rounded-full bg-neutral-800/80" />
            <div className="h-6 w-14 rounded-full bg-neutral-800/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

