import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { chatService, type Chat } from '@/services/chatService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ChatsTab() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadChats = async () => {
    setLoading(true);
    const data = await chatService.getMyChats();
    setChats(data);
    setLoading(false);
  };

  useEffect(() => {
    loadChats();

    if (user) {
      const unsub = chatService.subscribeToMyChats(user.id, loadChats);
      return () => { unsub(); };
    }
  }, [user]);

  if (loading) return <div className="text-center py-8 text-gray-500 font-mono text-sm">Загрузка чатов...</div>;

  if (chats.length === 0) {
    return (
      <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
        <div className="text-4xl mb-2">💬</div>
        <div className="text-gray-400 font-mono text-sm">У вас пока нет активных чатов</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => navigate(`/chat/${chat.id}`)}
          className="w-full flex items-center gap-3 p-3 bg-gray-900/40 rounded-xl border border-white/5 hover:bg-white/5 transition-all text-left"
        >
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-cyber-green/20 border border-cyber-green flex items-center justify-center text-cyber-green font-mono">
              {(chat.other_user?.username || '?')[0].toUpperCase()}
            </div>
            {chat.other_user?.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-black rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-0.5">
              <div className="text-white font-mono text-sm truncate">{chat.other_user?.username}</div>
              <div className="text-[10px] text-gray-500 font-mono">
                {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: false, locale: ru })}
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-400 truncate pr-4">
                {chat.last_message ? (
                  chat.last_message.sender_id === user?.id 
                    ? `Вы: ${chat.last_message.content}` 
                    : chat.last_message.content
                ) : (
                  'Напишите первое сообщение'
                )}
              </div>
              {chat.unread_count > 0 && (
                <div className="bg-cyber-green text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {chat.unread_count}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
