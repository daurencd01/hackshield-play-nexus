import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const FriendRequestSchema = z.object({
  id: z.string().uuid(),
  from_user_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'declined', 'cancelled']),
  message: z.string().nullable().optional(),
  created_at: z.string(),
  responded_at: z.string().nullable().optional(),
  from_user: z.object({
    id: z.string().uuid(),
    username: z.string().nullable().transform(val => val || "Аноним"),
    avatar_url: z.string().nullable().optional(),
    xp: z.preprocess((val) => val ?? 0, z.number().int()).default(0),
    level: z.preprocess((val) => val ?? 1, z.number().int()).default(1)
  }).optional()
});


export type FriendRequest = z.infer<typeof FriendRequestSchema>;

export const friendsService = {
  async sendRequest(toUserId: string, message?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Unauthorized' };

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          message,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Заявка уже отправлена' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async acceptRequest(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('accept_friend_request', {
      request_id: requestId
    });
    if (error) {
      console.error('Accept failed:', error);
      return false;
    }
    return data;
  },

  async declineRequest(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('decline_friend_request', {
      request_id: requestId
    });
    if (error) {
      console.error('Decline failed:', error);
      return false;
    }
    return data;
  },

  async getIncomingRequests(): Promise<FriendRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          from_user:profiles!from_user_id(id, username, avatar_url, xp, level)
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => FriendRequestSchema.parse(d));
    } catch (e) {
      console.error('[Friends] Incoming requests failed:', e);
      return [];
    }
  },

  async getFriendshipStatus(otherUserId: string): Promise<
    'none' | 'friends' | 'request_sent' | 'request_received' | 'self'
  > {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'none';
    if (user.id === otherUserId) return 'self';

    const { data: friendship } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', user.id)
      .eq('friend_id', otherUserId)
      .maybeSingle();

    if (friendship) return 'friends';

    const { data: sentReq } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_user_id', user.id)
      .eq('to_user_id', otherUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (sentReq) return 'request_sent';

    const { data: recvReq } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_user_id', otherUserId)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (recvReq) return 'request_received';

    return 'none';
  },

  subscribeToRequests(userId: string, callback: (req: FriendRequest) => void) {
    const channel = supabase
      .channel(`friend_requests:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as any);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  async removeFriend(friendId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (error) {
      console.error('[Friends] Remove failed:', error);
      return false;
    }
    return true;
  }
};

