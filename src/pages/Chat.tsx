import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatInfo = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          user1:profiles!user1_id(id, username, avatar_url, is_online, last_seen_at),
          user2:profiles!user2_id(id, username, avatar_url, is_online, last_seen_at)
        `)
        .eq('id', chatId)
        .single();

      if (error || !data) {
        console.error('Chat not found or access denied', error);
        navigate('/arena');
        return;
      }

      const other = data.user1.id === user.id ? data.user2 : data.user1;
      setOtherUser(other);
      setLoading(false);
    };

    fetchChatInfo();
  }, [chatId, user, navigate]);

  if (!chatId || loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[60]">
        <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!otherUser) return null;

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <ChatWindow
        chatId={chatId}
        otherUser={otherUser}
        onBack={() => navigate('/arena')}
      />
    </div>
  );
}
