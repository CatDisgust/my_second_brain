export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* 呼吸的圆点：神经元激活频率 */}
        <div className="relative h-5 w-5">
          <div className="absolute inset-0 rounded-full bg-neutral-200/30 animate-ping" />
          <div className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-neutral-200/70 animate-pulse" />
        </div>

        <div className="text-[11px] tracking-[0.18em] text-neutral-500/80 animate-pulse">
          Syncing Second Brain...
        </div>
      </div>
    </div>
  );
}

