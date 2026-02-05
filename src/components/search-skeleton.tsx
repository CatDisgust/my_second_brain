import * as React from 'react';

export function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(247,235,225,0.8)] border border-white/40"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-11/12 rounded bg-slate-200" />
            <div className="h-4 w-9/12 rounded bg-slate-200" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-6 w-14 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

