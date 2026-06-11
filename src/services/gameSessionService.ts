import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const log = createLogger('GameSession');

export const gameSessionService = {
  async createSession(userId: string, isCoop: boolean = true) {
    try {
      const { data, error } = await supabase.rpc('create_game_session', {
        p_user_id: userId,
        p_is_coop: isCoop
      });

      if (error) throw error;
      return data;
    } catch (e) {
      log.error('Failed to create game session:', e);
      return null;
    }
  },

  async joinSession(userId: string, roomCode: string) {
    try {
      const { data, error } = await supabase.rpc('join_game_session', {
        p_user_id: userId,
        p_room_code: roomCode.toUpperCase()
      });

      if (error) throw error;
      return data;
    } catch (e) {
      log.error('Failed to join game session:', e);
      return { success: false, message: 'Connection error' };
    }
  },

  async updateSessionStatus(sessionId: string, status: string) {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (e) {
      log.error('Failed to update session status:', e);
      return false;
    }
  },

  async getSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      log.error('Failed to fetch session:', e);
      return null;
    }
  },

  async logEvent(sessionId: string, userId: string, eventType: string, eventData: any = {}) {
    try {
      const { error } = await supabase
        .from('game_session_events')
        .insert({
          session_id: sessionId,
          user_id: userId,
          event_type: eventType,
          event_data: eventData
        });

      if (error) throw error;
    } catch (e) {
      log.error('Failed to log session event:', e);
    }
  }
};
