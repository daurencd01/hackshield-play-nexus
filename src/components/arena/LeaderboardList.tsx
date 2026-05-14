import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/services/leaderboardService';
import { getRankByXP } from '@/lib/ranks';

interface Props {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry | null;
  currentUserId?: string;
  loading: boolean;
  startPosition: number;
}

export function LeaderboardList({ entries, myRank, currentUserId, loading, startPosition }: Props) {
  if (loading && entries.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <LeaderboardRow 
          key={entry.id} 
          entry={entry} 
          position={startPosition + i} 
          isMe={entry.id === currentUserId}
        />
      ))}

      {myRank && !entries.find(e => e.id === currentUserId) && (
        <>
          <div className="text-center py-2 text-gray-500 text-xs">...</div>
          <LeaderboardRow 
            entry={myRank} 
            position={myRank.global_rank} 
            isMe={true}
          />
        </>
      )}
    </div>
  );
}

function LeaderboardRow({ entry, position, isMe }: { entry: LeaderboardEntry; position: number; isMe: boolean }) {
  const rank = getRankByXP(entry.xp);
  const initials = (entry.username?.[0] || '?').toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-3 p-3 rounded-xl border transition-all
        ${isMe 
          ? 'bg-cyber-green/10 border-cyber-green/40 box-glow-green' 
          : 'bg-black/40 border-white/5 hover:bg-white/5'}
      `}
    >
      <div className="w-6 text-xs font-mono text-gray-500 text-center">
        #{position}
      </div>

      <div className="relative">
        <div className={`
          w-10 h-10 rounded-full overflow-hidden border
          ${isMe ? 'border-cyber-green' : 'border-white/10'}
          bg-black flex items-center justify-center
        `}>
          {entry.avatar_url ? (
            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-cyber-green font-mono">{initials}</span>
          )}
        </div>
        {entry.is_online && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-black rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-mono truncate ${isMe ? 'text-cyber-green' : 'text-white'}`}>
          {entry.username}
          {isMe && <span className="ml-2 text-[10px] text-gray-500">(Вы)</span>}
        </div>
        <div className={`text-[10px] font-bold ${rank.color}`}>
          {rank.name.ru} · LVL {entry.level}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-bold font-mono text-yellow-400">
          {entry.xp}
        </div>
        <div className="text-[10px] text-gray-500 font-mono">XP</div>
      </div>
    </motion.div>
  );
}
