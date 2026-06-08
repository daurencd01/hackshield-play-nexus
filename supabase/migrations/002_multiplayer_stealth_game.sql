
-- Multiplayer and Stealth Game Extension
-- Date: 2024-05-16

-- 1. Таблица игровых сессий
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_user_id UUID REFERENCES auth.users(id),
  guest_user_id UUID REFERENCES auth.users(id),
  current_room INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','ready_check','in_game','completed','failed','abandoned')),
  is_coop BOOLEAN DEFAULT true,
  alarm_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_code ON game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_host ON game_sessions(host_user_id);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_select" ON game_sessions;
CREATE POLICY "sessions_select" ON game_sessions FOR SELECT TO authenticated 
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id OR status = 'waiting');

DROP POLICY IF EXISTS "sessions_insert" ON game_sessions;
CREATE POLICY "sessions_insert" ON game_sessions FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = host_user_id);

DROP POLICY IF EXISTS "sessions_update" ON game_sessions;
CREATE POLICY "sessions_update" ON game_sessions FOR UPDATE TO authenticated 
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

-- 2. Логи действий в сессии (для статистики)
CREATE TABLE IF NOT EXISTS game_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'hack_terminal','open_door','spotted','quiz_correct','quiz_wrong','room_complete'
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_session ON game_session_events(session_id);
ALTER TABLE game_session_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_insert" ON game_session_events;
CREATE POLICY "events_insert" ON game_session_events FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_select" ON game_session_events;
CREATE POLICY "events_select" ON game_session_events FOR SELECT TO authenticated USING (true);

-- 3. Лидерборд по комнатам
CREATE TABLE IF NOT EXISTS room_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL,
  completion_time_seconds INTEGER NOT NULL,
  detected_count INTEGER DEFAULT 0,
  hacks_completed INTEGER DEFAULT 0,
  xp_earned INTEGER NOT NULL,
  was_coop BOOLEAN DEFAULT false,
  partner_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_room ON room_leaderboard(room_id, completion_time_seconds);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON room_leaderboard(user_id);
ALTER TABLE room_leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leaderboard_select" ON room_leaderboard;
CREATE POLICY "leaderboard_select" ON room_leaderboard FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "leaderboard_insert" ON room_leaderboard;
CREATE POLICY "leaderboard_insert" ON room_leaderboard FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Функция генерации room_code
CREATE OR REPLACE FUNCTION generate_room_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- без 0,1,O,I для читаемости
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 5. Функция создания сессии
CREATE OR REPLACE FUNCTION create_game_session(p_user_id UUID, p_is_coop BOOLEAN DEFAULT true)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code TEXT;
  v_session_id UUID;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := generate_room_code();
    v_attempts := v_attempts + 1;
    EXIT WHEN NOT EXISTS(SELECT 1 FROM game_sessions WHERE room_code = v_code AND status NOT IN ('completed','failed','abandoned'));
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;

  INSERT INTO game_sessions (room_code, host_user_id, is_coop, status)
  VALUES (v_code, p_user_id, p_is_coop, CASE WHEN p_is_coop THEN 'waiting' ELSE 'in_game' END)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('session_id', v_session_id, 'room_code', v_code);
END;
$$;

-- 6. Функция присоединения к сессии
CREATE OR REPLACE FUNCTION join_game_session(p_user_id UUID, p_room_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session game_sessions;
BEGIN
  SELECT * INTO v_session FROM game_sessions 
  WHERE room_code = p_room_code AND status = 'waiting' AND guest_user_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Room not found or full');
  END IF;
  
  IF v_session.host_user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are the host');
  END IF;
  
  UPDATE game_sessions SET guest_user_id = p_user_id, status = 'ready_check'
  WHERE id = v_session.id;
  
  RETURN jsonb_build_object('success', true, 'session_id', v_session.id);
END;
$$;

-- 7. VIEW топ-10 за каждую комнату
CREATE OR REPLACE VIEW top_room_results AS
SELECT 
  rl.*,
  p.username,
  p.avatar_url,
  ROW_NUMBER() OVER (PARTITION BY rl.room_id ORDER BY rl.completion_time_seconds ASC) as rank
FROM room_leaderboard rl
JOIN profiles p ON p.id = rl.user_id;
