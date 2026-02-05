export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f9f8f6] text-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-5 w-5">
          <div className="absolute inset-0 rounded-full bg-indigo-300 animate-ping" />
          <div className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
        </div>

        <div className="text-stone-500 font-medium tracking-widest text-xs uppercase animate-pulse">
          Syncing Second Brain...
        </div>
      </div>
    </div>
  );
}

