import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, UserX, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { leaderboardService, type LeaderboardEntry } from '@/services/leaderboardService';
import { friendsService } from '@/services/friendsService';
import { chatService } from '@/services/chatService';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  onAddFriend: () => void;
}

export function FriendsTab({ onAddFriend }: Props) {
  const [friends, setFriends] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadFriends = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: friendsData } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = (friendsData || []).map(f => f.friend_id);
    
    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('leaderboard_live')
      .select('*')
      .in('id', friendIds);

    setFriends(profiles as any || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const handleStartChat = async (friendId: string) => {
    const chatId = await chatService.getOrCreateChat(friendId);
    if (chatId) navigate(`/chat/${chatId}`);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (confirm('Удалить из друзей?')) {
      const success = await friendsService.removeFriend(friendId);
      if (success) loadFriends();
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500 font-mono text-sm">Загрузка друзей...</div>;

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
        <div className="text-4xl mb-2">👥</div>
        <div className="text-gray-400 font-mono text-sm mb-4">У вас пока нет друзей</div>
        <button
          onClick={onAddFriend}
          className="inline-flex items-center gap-2 px-6 py-2 bg-cyber-green text-black font-bold rounded-lg active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Найти друзей
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center gap-3 p-3 bg-gray-900/40 rounded-xl border border-white/5">
          <Link to={`/profile/${friend.username || friend.id}`} className="relative group">
            <div className="w-10 h-10 rounded-full bg-cyber-green/20 border border-cyber-green flex items-center justify-center text-cyber-green font-mono group-hover:scale-105 transition-transform">
              {(friend.username || '?')[0].toUpperCase()}
            </div>
            {friend.is_online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-black rounded-full" />
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link to={`/profile/${friend.username || friend.id}`} className="text-white font-mono text-sm truncate hover:text-cyber-green transition-colors block">
              {friend.username}
            </Link>
            <div className="text-[10px] text-gray-500 uppercase font-mono">LVL {friend.level}</div>
          </div>


          <div className="flex gap-2">
            <button
              onClick={() => handleStartChat(friend.id)}
              className="p-2 bg-cyber-green/20 border border-cyber-green/40 text-cyber-green rounded-lg active:scale-90"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRemoveFriend(friend.id)}
              className="p-2 bg-red-500/10 border border-red-500/20 text-red-500/60 rounded-lg active:scale-90"
            >
              <UserX className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
