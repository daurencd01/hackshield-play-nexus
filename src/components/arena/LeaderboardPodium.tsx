import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/services/leaderboardService';
import { getRankByXP } from '@/lib/ranks';

interface Props {
  top3: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardPodium({ top3, currentUserId }: Props) {
  const order = [1, 0, 2]; // Visual order: 2nd, 1st, 3rd
  const heights = ['h-24', 'h-32', 'h-20'];
  const colors = ['text-gray-400', 'text-yellow-400', 'text-orange-400'];
  const labels = ['🥈', '🥇', '🥉'];

  return (
    <div className="flex items-end justify-center gap-2 mb-8 mt-4">
      {order.map((idx, visualIdx) => {
        const entry = top3[idx];
        if (!entry) return null;

        const rank = getRankByXP(entry.xp);
        const initials = (entry.username?.[0] || '?').toUpperCase();
        const isMe = entry.id === currentUserId;

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: visualIdx * 0.1 }}
            className="flex flex-col items-center flex-1 max-w-[120px]"
          >
            <div className="relative mb-2">
              <div className={`
                w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 
                ${isMe ? 'border-cyber-green' : 'border-white/10'}
                bg-black/40 flex items-center justify-center
              `}>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-cyber-green font-mono">{initials}</span>
                )}
              </div>
              <div className="absolute -top-1 -right-1 text-lg">
                {labels[visualIdx]}
              </div>
            </div>

            <div className="text-center mb-1">
              <div className={`text-xs font-mono truncate w-full ${isMe ? 'text-cyber-green' : 'text-white'}`}>
                {entry.username}
              </div>
              <div className={`text-[10px] font-bold ${rank.color}`}>
                {rank.name.ru}
              </div>
            </div>

            <div className={`
              w-full ${heights[visualIdx]} bg-black/40 border border-white/5 
              rounded-t-lg flex flex-col items-center justify-center
            `}>
              <span className={`text-sm font-bold font-mono ${colors[idx]}`}>
                {entry.xp} XP
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
