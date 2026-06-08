-- ===================================================
-- HACKSHIELD BASELINE DATABASE RESET AND INITIAL SETUP
-- ===================================================

-- 1. Wipe all registered users from auth schema
DELETE FROM auth.users;

-- 2. Drop schema public cascade (wipes all tables, functions, views, triggers in public)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 3. Grant permissions back to public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 4. Recreate RLS auto enable event trigger
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end EXECUTE FUNCTION public.rls_auto_enable();

-- 5. Baseline Tables

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  xp INTEGER DEFAULT 0,
  telegram TEXT,
  instagram TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  bio TEXT,
  country TEXT,
  level INTEGER DEFAULT 1,
  social_links JSONB DEFAULT '{}'::jsonb,
  show_stats_publicly BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- users (compatibility table)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 300),
  telegram TEXT,
  instagram TEXT,
  country TEXT,
  language TEXT,
  rank TEXT DEFAULT 'Newbie'
);

-- friends
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (user_id, friend_id)
);

-- friend_requests
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (from_user_id, to_user_id)
);

-- chats
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'challenge')),
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ
);

-- achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT
);

-- user_achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW()
);

-- user_logs
CREATE TABLE public.user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- quiz_categories
CREATE TABLE public.quiz_categories (
  id TEXT PRIMARY KEY,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_kk TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0
);

-- quizzes
CREATE TABLE public.quizzes (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.quiz_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'text_input', 'binary', 'sequence', 'code_input')),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  title_ru TEXT NOT NULL,
  title_en TEXT,
  title_kk TEXT,
  description_ru TEXT NOT NULL,
  description_en TEXT,
  description_kk TEXT,
  hint_ru TEXT,
  hint_en TEXT,
  hint_kk TEXT,
  correct_answer TEXT,
  accept_variants TEXT[] DEFAULT '{}'::text[],
  case_sensitive BOOLEAN DEFAULT false,
  correct_choice TEXT,
  correct_sequence TEXT[] DEFAULT '{}'::text[],
  time_limit_seconds INTEGER,
  xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
  penalty_on_fail INTEGER DEFAULT 10,
  tags TEXT[] DEFAULT '{}'::text[],
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- quiz_options
CREATE TABLE public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  text_ru TEXT NOT NULL,
  text_en TEXT,
  text_kk TEXT,
  is_correct BOOLEAN DEFAULT false,
  explanation_ru TEXT,
  explanation_en TEXT,
  explanation_kk TEXT,
  order_index INTEGER DEFAULT 0
);

-- scenario_progress
CREATE TABLE public.scenario_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  current_step_id TEXT,
  completed_steps TEXT[] DEFAULT '{}'::text[],
  history TEXT[] DEFAULT '{}'::text[],
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  hints_used INTEGER DEFAULT 0,
  flags JSONB DEFAULT '{}'::jsonb,
  answers JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  attempts INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, scenario_id)
);

-- game_progress
CREATE TABLE public.game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  current_room_index INTEGER DEFAULT 0 CHECK (current_room_index >= 0),
  completed_rooms INTEGER[] DEFAULT '{}'::integer[],
  total_rooms INTEGER,
  session_xp INTEGER DEFAULT 0 CHECK (session_xp >= 0),
  total_xp_earned INTEGER DEFAULT 0,
  health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  has_key_card BOOLEAN DEFAULT false,
  flags JSONB DEFAULT '{}'::jsonb,
  inventory JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'abandoned')),
  attempts INTEGER DEFAULT 1,
  total_play_time_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_user ON public.game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_mission ON public.game_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_status ON public.game_progress(status);
CREATE INDEX IF NOT EXISTS idx_game_progress_last_played ON public.game_progress(last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON public.quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON public.quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON public.quizzes(is_published) WHERE (is_published = true);
CREATE INDEX IF NOT EXISTS idx_quiz_options_quiz ON public.quiz_options(quiz_id);
CREATE INDEX IF NOT EXISTS idx_scenario_progress_user ON public.scenario_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_progress_mission ON public.scenario_progress(mission_id);

-- RLS Policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert for authenticated users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view all achievements" ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their own unlocked achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own unlocked achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON public.game_progress FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own progress" ON public.game_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.game_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.game_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own scenario progress" ON public.scenario_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scenario progress" ON public.scenario_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own scenario progress" ON public.scenario_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Quizzes readable by everyone" ON public.quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "Quiz options readable by everyone" ON public.quiz_options FOR SELECT USING (true);
CREATE POLICY "Categories readable by everyone" ON public.quiz_categories FOR SELECT USING (true);

CREATE POLICY "Users see own requests" ON public.friend_requests FOR SELECT USING ((auth.uid() = from_user_id) OR (auth.uid() = to_user_id));
CREATE POLICY "Users send requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipients update requests" ON public.friend_requests FOR UPDATE USING (auth.uid() = to_user_id);
CREATE POLICY "Senders delete requests" ON public.friend_requests FOR DELETE USING (auth.uid() = from_user_id);

CREATE POLICY "Users see own friends" ON public.friends FOR SELECT USING ((auth.uid() = user_id) OR (auth.uid() = friend_id));
CREATE POLICY "Users manage own friends" ON public.friends FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own chats" ON public.chats FOR SELECT USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
CREATE POLICY "Users create chats" ON public.chats FOR INSERT WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

CREATE POLICY "Users see messages in own chats" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = messages.chat_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())));
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Baseline Functions

CREATE OR REPLACE FUNCTION public.update_last_played()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_played_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_xp(xp_to_add integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET xp = xp + xp_to_add,
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_xp(user_id uuid, amount integer)
 RETURNS void
 LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET xp = xp + amount
  WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_presence()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    last_seen_at = NOW(),
    is_online = TRUE
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req
  FROM public.friend_requests
  WHERE id = request_id
    AND to_user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Создаём двустороннюю связь
  INSERT INTO public.friends (user_id, friend_id, status, accepted_at)
  VALUES
    (req.from_user_id, req.to_user_id, 'accepted', NOW()),
    (req.to_user_id, req.from_user_id, 'accepted', NOW())
  ON CONFLICT DO NOTHING;

  -- Обновляем заявку
  UPDATE public.friend_requests
  SET status = 'accepted', responded_at = NOW()
  WHERE id = request_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_friend_request(request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.friend_requests
  SET status = 'declined', responded_at = NOW()
  WHERE id = request_id
    AND to_user_id = auth.uid()
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_chat(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  chat_id UUID;
  u1 UUID;
  u2 UUID;
BEGIN
  IF auth.uid() < other_user_id THEN
    u1 := auth.uid();
    u2 := other_user_id;
  ELSE
    u1 := other_user_id;
    u2 := auth.uid();
  END IF;

  SELECT id INTO chat_id FROM public.chats WHERE user1_id = u1 AND user2_id = u2;

  IF chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id) VALUES (u1, u2) RETURNING id INTO chat_id;
  END IF;

  RETURN chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_as_read(chat_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = TRUE, read_at = NOW()
  WHERE chat_id = chat_id_param
    AND sender_id != auth.uid()
    AND is_read = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Профиль: берём username и full_name из user_metadata (при регистрации с паролем)
  INSERT INTO public.profiles (id, email, username, full_name, xp, level, joined_at, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    0,
    1,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Совместимость с таблицей users
  INSERT INTO public.users (id, email, username, xp)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Baseline Triggers
CREATE TRIGGER trg_update_last_played
  BEFORE UPDATE ON public.game_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_last_played();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Baseline Seed Data

INSERT INTO public.quiz_categories (id, name_ru, name_en, name_kk, icon, color, order_index) VALUES
('social', 'Социальная инженерия', 'Social Engineering', 'Әлеуметтік инженерия', '🎭', '#ff6600', 1),
('network', 'Сетевая безопасность', 'Network Security', 'Желілік қауіпсіздік', '🌐', '#00aaff', 2),
('crypto', 'Криптография', 'Cryptography', 'Криптография', '🔐', '#aa00ff', 3),
('web', 'Web безопасность', 'Web Security', 'Веб қауіпсіздік', '🌍', '#00ff88', 4),
('malware', 'Вредоносное ПО', 'Malware', 'Зиянды бағдарлама', '🦠', '#ff4444', 5),
('forensics', 'Форензика', 'Forensics', 'Форензика', '🔍', '#ffaa00', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quizzes (id, category_id, type, difficulty, title_ru, title_en, title_kk, description_ru, description_en, description_kk, hint_ru, hint_en, hint_kk, correct_answer, accept_variants, case_sensitive, correct_choice, correct_sequence, time_limit_seconds, xp_reward, penalty_on_fail, tags, is_published, created_at, updated_at) VALUES
('q1_password', 'social', 'multiple_choice', 1, 'Безопасный пароль', null, null, 'Какой из этих паролей самый безопасный?', null, null, null, null, null, null, '{}'::text[], false, null, '{}'::text[], null, 50, 5, '{}'::text[], true, '2026-05-14 17:33:23.954433+00', '2026-05-14 17:33:23.954433+00'),
('q2_phishing', 'social', 'binary', 1, 'Подозрительное письмо', null, null, 'Получено письмо: "Срочно! Ваш аккаунт заблокирован. Перейдите по ссылке https://gооgle-secure.ru". Это фишинг?', null, null, 'Обрати внимание на букву "о" в адресе', null, null, null, '{}'::text[], false, 'yes', '{}'::text[], 15, 60, 10, '{}'::text[], true, '2026-05-14 17:33:23.954433+00', '2026-05-14 17:33:23.954433+00'),
('q3_sql', 'web', 'multiple_choice', 2, 'Странный ввод', null, null, 'В форме входа пользователь ввёл: admin'' OR ''1''=''1. Что это?', null, null, 'Кавычка и OR как в запросе к базе данных', null, null, null, '{}'::text[], false, null, '{}'::text[], null, 100, 15, '{}'::text[], true, '2026-05-14 17:33:23.954433+00', '2026-05-14 17:33:23.954433+00'),
('q4_hash', 'crypto', 'text_input', 3, 'Замена устаревшего', null, null, 'MD5 признан небезопасным для паролей. Какой современный алгоритм нужно использовать?', null, null, 'Начинается на букву "b" и связан с шифром "Blowfish"', null, null, 'bcrypt', '{Bcrypt,BCrypt,argon2,scrypt}'::text[], false, null, '{}'::text[], null, 130, 10, '{}'::text[], true, '2026-05-14 17:33:23.954433+00', '2026-05-14 17:33:23.954433+00'),
('q5_incident', 'forensics', 'sequence', 3, 'Атака шифровальщика', null, null, 'Сервер атакован программой-вымогателем. Расположите действия в правильном порядке:', null, null, 'Сначала остановить распространение, потом восстанавливать', null, null, null, '{}'::text[], false, null, '{Отключить сервер от сети,Уведомить службу безопасности,Сделать резервный образ диска,Восстановить данные из бэкапов,Закрыть уязвимость}'::text[], null, 150, 10, '{}'::text[], true, '2026-05-14 17:33:23.954433+00', '2026-05-14 17:33:23.954433+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quiz_options (id, quiz_id, text_ru, text_en, text_kk, is_correct, explanation_ru, explanation_en, explanation_kk, order_index) VALUES
('8442801b-b816-4b9a-8481-8935cd30d9fd', 'q1_password', '123456', null, null, false, 'Самый популярный пароль — взламывается за секунду', null, null, 1),
('27815764-b7c5-45c5-9727-bf5a07e4330a', 'q1_password', 'password', null, null, false, 'Это слово в первой строке любого словаря атаки', null, null, 2),
('4682c39b-026a-4f72-865b-f294dd8cf742', 'q1_password', 'Tr#9$kP2!mZ7nQ', null, null, true, 'Длинный пароль с разными символами — отличный выбор!', null, null, 3),
('3ae30f7b-65c0-4aad-8758-4718745a6abb', 'q1_password', 'qwerty2024', null, null, false, 'Содержит шаблон клавиатуры и год — легко угадывается', null, null, 4),
('3c8d8388-6097-4b38-ae6d-4183c7cd8164', 'q3_sql', 'Просто опечатка', null, null, false, 'Слишком сложная "опечатка"', null, null, 1),
('ebafb262-2232-4742-af5f-928ae07e482b', 'q3_sql', 'SQL-инъекция', null, null, true, 'Верно! Классическая атака для обхода авторизации', null, null, 2),
('a890d07b-92eb-475d-8fe5-4a6ee7eb44da', 'q3_sql', 'XSS-атака', null, null, false, 'XSS использует JavaScript-теги, не SQL-синтаксис', null, null, 3),
('30591ed5-a07e-4943-afdc-2c0ae87ed2c0', 'q3_sql', 'DDoS-атака', null, null, false, 'DDoS — это перегрузка сервера запросами', null, null, 4)
ON CONFLICT (id) DO NOTHING;
