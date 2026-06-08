-- Создаём VIEW leaderboard_live на основе таблицы profiles
CREATE OR REPLACE VIEW leaderboard_live AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.is_online,
  p.last_seen_at,
  COALESCE(p.xp, 0) as xp,
  COALESCE(p.level, 1) as level,
  p.bio,
  p.created_at,
  RANK() OVER (ORDER BY COALESCE(p.xp, 0) DESC) as global_rank,
  (
    SELECT COUNT(*) 
    FROM user_progress up 
    WHERE up.user_id = p.id AND up.is_correct = true
  ) as quizzes_completed,
  (
    SELECT COUNT(DISTINCT up.room_id) 
    FROM user_progress up 
    WHERE up.user_id = p.id
  ) as rooms_visited,
  (
    SELECT COUNT(*) 
    FROM game_sessions gs 
    WHERE (gs.host_user_id = p.id OR gs.guest_user_id = p.id) 
    AND gs.status = 'completed'
  ) as completed_missions,
  (
    SELECT COUNT(*) 
    FROM game_sessions gs 
    WHERE (gs.host_user_id = p.id OR gs.guest_user_id = p.id) 
    AND gs.status = 'completed'
  ) as games_completed
FROM profiles p
WHERE p.username IS NOT NULL
ORDER BY xp DESC;

-- RLS для VIEW (наследует от profiles)
-- Views автоматически используют RLS базовых таблиц
-- Но добавим грант для безопасности
GRANT SELECT ON leaderboard_live TO authenticated;
