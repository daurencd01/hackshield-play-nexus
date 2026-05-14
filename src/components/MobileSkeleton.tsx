import { motion } from 'framer-motion';

export function MobileCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/5 rounded w-1/2" />
          <div className="h-2 bg-white/5 rounded w-1/4" />
        </div>
      </div>
      <div className="h-4 bg-white/5 rounded w-full mb-2" />
      <div className="h-4 bg-white/5 rounded w-2/3" />
    </div>
  );
}

export function MissionSkeleton() {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3 border-white/5">
      <div className="w-16 h-16 rounded-lg bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/5 rounded w-3/4" />
        <div className="h-2 bg-white/5 rounded w-1/2" />
      </div>
      <div className="w-4 h-4 rounded-full bg-white/5" />
    </div>
  );
}
