import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, UserPlus, MessageCircle, Clock } from 'lucide-react';
import { leaderboardService, type LeaderboardEntry } from '@/services/leaderboardService';
import { friendsService } from '@/services/friendsService';
import { chatService } from '@/services/chatService';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export function UserSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await leaderboardService.searchUsers(query);
      setResults(found);

      const statusMap: Record<string, string> = {};
      await Promise.all(
        found.map(async (u) => {
          statusMap[u.id] = await friendsService.getFriendshipStatus(u.id);
        })
      );
      setStatuses(statusMap);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAddFriend = async (userId: string) => {
    const result = await friendsService.sendRequest(userId);
    if (result.success) {
      setStatuses(prev => ({ ...prev, [userId]: 'request_sent' }));
      toast({
        title: "Заявка отправлена",
        description: "Запрос в друзья успешно отправлен."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: result.error || "Не удалось отправить заявку"
      });
    }
  };


  const handleStartChat = async (userId: string) => {
    const chatId = await chatService.getOrCreateChat(userId);
    if (chatId) {
      navigate(`/chat/${chatId}`);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg md:rounded-2xl bg-black border-t-2 md:border-2 border-cyber-green/40 max-h-[90vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-cyber-green/20">
          <h2 className="text-cyber-green font-mono text-lg">Поиск игроков</h2>
          <button onClick={onClose} className="p-1 active:scale-90">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите никнейм..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-cyber-green focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading && <div className="text-center text-gray-500 text-sm py-8">Поиск...</div>}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">
              Игроки не найдены
            </div>
          )}

          <div className="space-y-2">
            {results.map(user => {
              const status = statuses[user.id];
              return (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-900/40 rounded-xl">
                  <Link 
                    to={`/profile/${user.username || user.id}`} 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-cyber-green/20 border border-cyber-green flex items-center justify-center text-cyber-green font-mono hover:scale-105 transition-transform"
                  >
                    {(user.username || '?')[0].toUpperCase()}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/profile/${user.username || user.id}`}
                      onClick={onClose}
                      className="text-white font-mono text-sm truncate block hover:text-cyber-green"
                    >
                      {user.username}
                    </Link>
                    <div className="text-xs text-gray-500 uppercase font-mono tracking-tighter">
                      LVL {user.level} · {user.xp} XP
                    </div>
                  </div>


                  <div className="flex gap-2">
                    {status === 'self' ? (
                      <span className="text-xs text-gray-500 px-2 py-1">Это вы</span>
                    ) : status === 'friends' ? (
                      <button
                        onClick={() => handleStartChat(user.id)}
                        className="p-2 bg-cyber-green/20 border border-cyber-green rounded-lg active:scale-90"
                      >
                        <MessageCircle className="w-4 h-4 text-cyber-green" />
                      </button>
                    ) : status === 'request_sent' ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 px-2">
                        <Clock className="w-3 h-3" /> Отправлено
                      </span>
                    ) : status === 'request_received' ? (
                      <span className="text-xs text-blue-400">Ждёт ответа</span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(user.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-cyber-green text-black text-xs font-mono rounded-lg active:scale-90"
                      >
                        <UserPlus className="w-3 h-3" />
                        Добавить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
