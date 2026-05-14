import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';
import { chatService, type Message } from '@/services/chatService';
import { useUser } from '@/hooks/useUser';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  chatId: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url?: string | null;
    is_online?: boolean | null;
    last_seen_at?: string | null;
  };
  onBack?: () => void;
}

export function ChatWindow({ chatId, otherUser, onBack }: Props) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    chatService.getMessages(chatId).then(msgs => {
      if (mounted) {
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }, 100);
      }
    });

    chatService.markAsRead(chatId);

    const unsub = chatService.subscribeToChat(
      chatId,
      (newMsg) => {
        if (!mounted) return;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_id !== user?.id) {
          chatService.markAsRead(chatId);
        }

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      },
      (updated) => {
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, [chatId, user]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    const text = input.trim();
    setInput('');

    const res = await chatService.sendMessage(chatId, text);
    if (!res) {
      // Restore input on failure
      setInput(text);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-black">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cyber-green/20 bg-black/80 backdrop-blur-md">
        {onBack && (
          <button onClick={onBack} className="md:hidden -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
        )}

        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-cyber-green/20 border border-cyber-green flex items-center justify-center text-cyber-green font-mono overflow-hidden">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              otherUser.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          {otherUser.is_online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-black rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white font-mono text-sm truncate">
            {otherUser.username}
          </div>
          <div className="text-xs text-gray-500">
            {otherUser.is_online
              ? 'в сети'
              : otherUser.last_seen_at
                ? `был(а) ${formatDistanceToNow(new Date(otherUser.last_seen_at), { addSuffix: true, locale: ru })}`
                : 'не в сети'}
          </div>
        </div>

        <button className="p-2 -mr-2 active:scale-90">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm font-mono mt-8">
            Загрузка сообщений...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm font-mono mt-12 px-8">
            <div className="text-4xl mb-4">💬</div>
            Это начало вашей переписки с <span className="text-cyber-green">{otherUser.username}</span>.
            Будьте вежливы и соблюдайте правила платформы.
          </div>
        ) : (
          <div>
            {groupedMessages.map(({ date, messages: dayMessages }) => (
              <div key={date}>
                <div className="text-center my-6">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                    {formatDateLabel(date)}
                  </span>
                </div>
                {dayMessages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  const prevMsg = dayMessages[i - 1];
                  const groupedWithPrev = prevMsg?.sender_id === msg.sender_id;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMine={isMine}
                      grouped={groupedWithPrev}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-black/80 backdrop-blur-md border-t border-white/5"
           style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-end gap-2 bg-white/5 rounded-2xl p-1 px-2 border border-white/5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent border-none rounded-2xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none min-h-[44px] max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-cyber-green rounded-xl text-black disabled:opacity-50 active:scale-90 transition-all mb-0.5"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  grouped
}: {
  message: Message;
  isMine: boolean;
  grouped: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-4'}`}
    >
      <div
        className={`
          max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-lg
          ${isMine
            ? 'bg-cyber-green text-black rounded-2xl rounded-tr-sm font-medium'
            : 'bg-gray-800/80 text-white rounded-2xl rounded-tl-sm border border-white/5'}
        `}
      >
        {message.is_deleted ? (
          <span className="italic text-gray-500 text-xs">сообщение удалено</span>
        ) : (
          <>
            <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
            <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono ${isMine ? 'text-black/60' : 'text-gray-500'}`}>
              {message.is_edited && <span>изменено</span>}
              <span>{format(new Date(message.created_at), 'HH:mm')}</span>
              {isMine && (
                <span className={message.is_read ? 'text-blue-700' : ''}>
                  {message.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function groupMessagesByDate(messages: Message[]) {
  const groups = new Map<string, Message[]>();

  messages.forEach(msg => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(msg);
  });

  return Array.from(groups.entries()).map(([date, messages]) => ({
    date,
    messages
  }));
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMMM yyyy', { locale: ru });
}
