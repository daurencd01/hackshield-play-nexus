import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, MessageCircle, UserPlus, Search, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import { leaderboardService, type LeaderboardEntry } from '@/services/leaderboardService';
import { friendsService, type FriendRequest } from '@/services/friendsService';
import { LeaderboardPodium } from '@/components/arena/LeaderboardPodium';
import { LeaderboardList } from '@/components/arena/LeaderboardList';
import { FriendsTab } from '@/components/arena/FriendsTab';
import { ChatsTab } from '@/components/arena/ChatsTab';
import { RequestsList } from '@/components/arena/RequestsList';
import { UserSearchModal } from '@/components/arena/UserSearchModal';

type Tab = 'global' | 'friends' | 'chats' | 'requests';

export default function ArenaPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('global');
  const [searchOpen, setSearchOpen] = useState(false);

  // Leaderboard — cached; keeps previous data on refetch so the rating never flashes empty.
  const leaderboardQ = useQuery({
    queryKey: ['leaderboard', 'top'],
    queryFn: () => leaderboardService.getTop(50),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const myRankQ = useQuery({
    queryKey: ['leaderboard', 'myRank', user?.id],
    queryFn: () => (user ? leaderboardService.getMyRank(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const requestsQ = useQuery({
    queryKey: ['friendRequests', user?.id],
    queryFn: () => (user ? friendsService.getIncomingRequests() : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const globalLeaderboard: LeaderboardEntry[] = leaderboardQ.data ?? [];
  const myRank: LeaderboardEntry | null = myRankQ.data ?? null;
  const requests: FriendRequest[] = requestsQ.data ?? [];
  const loading = leaderboardQ.isLoading;

  const loadData = () => {
    leaderboardQ.refetch();
    myRankQ.refetch();
    requestsQ.refetch();
  };

  // Realtime: invalidate via refetch (React Query dedupes rapid calls).
  useEffect(() => {
    const unsub = leaderboardService.subscribeToTopChanges(() => { leaderboardQ.refetch(); });
    let unsubReqs: (() => void) | null = null;
    if (user) {
      unsubReqs = friendsService.subscribeToRequests(user.id, () => { requestsQ.refetch(); });
    }
    return () => { unsub(); unsubReqs?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const top3 = globalLeaderboard.slice(0, 3);
  const rest = globalLeaderboard.slice(3);

  return (
    <Layout title="Арена">
      <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto pb-24">
        
        {/* Title */}
        <div className="mb-6">
          <h1 className="font-orbitron text-2xl font-bold text-cyber-green text-glow-green">
            ▸ АРЕНА
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Соревнуйся с лучшими хакерами и общайся с друзьями
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 -mx-4 px-4 overflow-x-auto scrollbar-none pb-2">
          <TabButton
            active={tab === 'global'}
            onClick={() => setTab('global')}
            icon={Trophy}
            label="Рейтинг"
          />
          <TabButton
            active={tab === 'friends'}
            onClick={() => setTab('friends')}
            icon={Users}
            label="Друзья"
          />
          <TabButton
            active={tab === 'chats'}
            onClick={() => setTab('chats')}
            icon={MessageCircle}
            label="Чаты"
          />
          <TabButton
            active={tab === 'requests'}
            onClick={() => setTab('requests')}
            icon={UserPlus}
            label="Заявки"
            badge={requests.length}
          />
        </div>

        {/* Action bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
            {tab === 'global' ? 'Глобальный рейтинг' : 
             tab === 'friends' ? 'Ваши контакты' : 
             tab === 'chats' ? 'Активные переписки' : 'Входящие запросы'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-cyber-green/10 border border-cyber-green/30 rounded-lg text-cyber-green text-xs font-mono active:scale-95 transition-all hover:bg-cyber-green/20"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Поиск</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-black/40 border border-white/10 rounded-lg text-gray-400 active:scale-95 transition-all hover:text-cyber-green"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === 'global' && (
            <motion.div
              key="global"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {top3.length > 0 && (
                <LeaderboardPodium top3={top3} currentUserId={user?.id} />
              )}
              <LeaderboardList
                entries={rest}
                myRank={myRank}
                currentUserId={user?.id}
                loading={loading}
                startPosition={4}
              />
            </motion.div>
          )}

          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FriendsTab onAddFriend={() => setSearchOpen(true)} />
            </motion.div>
          )}

          {tab === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ChatsTab />
            </motion.div>
          )}

          {tab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RequestsList requests={requests} onUpdate={loadData} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search modal */}
        <AnimatePresence>
          {searchOpen && (
            <UserSearchModal onClose={() => setSearchOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs
        transition-all active:scale-95 relative
        ${active
          ? 'bg-cyber-green text-black font-bold shadow-[0_0_15px_rgba(0,255,157,0.3)]'
          : 'bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200'}
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}
