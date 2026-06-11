import { motion } from 'framer-motion';
import { FriendRequest, friendsService } from '@/services/friendsService';
import { Check, X, Clock } from 'lucide-react';

interface Props {
  requests: FriendRequest[];
  onUpdate: () => void;
}

export function RequestsList({ requests, onUpdate }: Props) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
        <div className="text-4xl mb-2">📩</div>
        <div className="text-gray-400 font-mono text-sm">Нет новых заявок</div>
      </div>
    );
  }

  const handleAccept = async (id: string) => {
    const success = await friendsService.acceptRequest(id);
    if (success) onUpdate();
  };

  const handleDecline = async (id: string) => {
    const success = await friendsService.declineRequest(id);
    if (success) onUpdate();
  };

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-gray-900/60 border border-white/5 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-cyber-green/20 border border-cyber-green flex items-center justify-center text-cyber-green font-mono">
            {(req.from_user?.username || '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white font-mono text-sm truncate">{req.from_user?.username}</div>
            <div className="text-xs text-gray-500">Хочет добавить вас в друзья</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleAccept(req.id)}
              className="p-2 bg-cyber-green text-black rounded-lg active:scale-90"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDecline(req.id)}
              className="p-2 bg-red-500/20 border border-red-500/40 text-red-500 rounded-lg active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
