import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const log = createLogger('ChatService');


export const MessageSchema = z.object({
  id: z.string().uuid(),
  chat_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string(),
  message_type: z.enum(['text', 'system', 'challenge']).default('text'),
  metadata: z.record(z.unknown()).nullable().optional(),
  is_read: z.preprocess((val) => val ?? false, z.boolean()).default(false),
  is_edited: z.preprocess((val) => val ?? false, z.boolean()).default(false),
  is_deleted: z.preprocess((val) => val ?? false, z.boolean()).default(false),
  created_at: z.string(),
  read_at: z.string().nullable().optional(),
  edited_at: z.string().nullable().optional()
});

export type Message = z.infer<typeof MessageSchema>;

export const ChatSchema = z.object({
  id: z.string().uuid(),
  user1_id: z.string().uuid(),
  user2_id: z.string().uuid(),
  last_message_at: z.string(),
  created_at: z.string(),
  other_user: z.object({
    id: z.string().uuid(),
    username: z.string().nullable().transform(val => val || "Аноним"),
    avatar_url: z.string().nullable().optional(),
    is_online: z.preprocess((val) => val ?? false, z.boolean()).optional(),
    last_seen_at: z.string().nullable().optional()
  }).optional(),
  last_message: MessageSchema.nullable().optional(),
  unread_count: z.preprocess((val) => val ?? 0, z.number().int()).default(0).optional()
});


export type Chat = z.infer<typeof ChatSchema>;

export const chatService = {
  async getOrCreateChat(otherUserId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_or_create_chat', {
      other_user_id: otherUserId
    });

    if (error) {
      log.error('Failed to get/create chat:', error);
      return null;
    }

    return data;
  },

  async getMyChats(): Promise<Chat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:profiles!user1_id(id, username, avatar_url, is_online, last_seen_at),
          user2:profiles!user2_id(id, username, avatar_url, is_online, last_seen_at)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const chats = await Promise.all((data || []).map(async (chat: any) => {
        const otherUser = chat.user1_id === user.id ? chat.user2 : chat.user1;

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return ChatSchema.parse({
          ...chat,
          other_user: otherUser,
          last_message: lastMsg,
          unread_count: count || 0
        });
      }));

      return chats;
    } catch (e) {
      log.error('Get my chats failed:', e);
      return [];
    }

  },

  async getMessages(chatId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(d => MessageSchema.parse(d)).reverse();
    } catch (e) {
      log.error('Get messages failed:', e);
      return [];
    }

  },

  async sendMessage(
    chatId: string,
    content: string,
    type: 'text' | 'challenge' = 'text',
    metadata?: any
  ): Promise<Message | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const trimmed = content.trim().slice(0, 2000);
      if (!trimmed) return null;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: trimmed,
          message_type: type,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      return MessageSchema.parse(data);
    } catch (e) {
      log.error('Send message failed:', e);
      return null;
    }

  },

  async markAsRead(chatId: string): Promise<void> {
    await supabase.rpc('mark_chat_as_read', { chat_id_param: chatId });
  },

  subscribeToChat(
    chatId: string,
    onNewMessage: (msg: Message) => void,
    onUpdateMessage?: (msg: Message) => void
  ) {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          try {
            const msg = MessageSchema.parse(payload.new);
            onNewMessage(msg);
          } catch (e) {
            console.warn('Invalid message payload:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          if (onUpdateMessage) {
            try {
              const msg = MessageSchema.parse(payload.new);
              onUpdateMessage(msg);
            } catch {}
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToMyChats(userId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`my_chats:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user1_id.eq.${userId}`
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user2_id.eq.${userId}`
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => onUpdate() // Simplification: update list on any new message for now
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};

