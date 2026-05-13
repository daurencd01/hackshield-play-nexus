-- HackShield Play Nexus — Proposed DB Schema (Supabase/PostgreSQL)

-- 1. Profiles Table (Extends Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0 NOT NULL CHECK (xp >= 0),
  level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1 AND level <= 100),
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Missions Table
CREATE TABLE public.missions (
  id TEXT PRIMARY KEY,
  title_ru TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  xp_reward INTEGER NOT NULL,
  category TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Mission Progress
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mission_id TEXT REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  current_step INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- 4. Achievements Table
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  title_ru TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  icon TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_json JSONB -- Declarative requirements
);

-- 5. User Achievements (Many-to-Many)
CREATE TABLE public.user_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- 6. Leaderboard View (Materialized for performance)
CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.xp,
  p.level,
  p.avatar_url,
  COUNT(up.id) FILTER (WHERE up.status = 'completed') as missions_completed,
  RANK() OVER (ORDER BY p.xp DESC) as global_rank
FROM public.profiles p
LEFT JOIN public.user_progress up ON up.user_id = p.id
GROUP BY p.id;

CREATE UNIQUE INDEX idx_leaderboard_id ON public.leaderboard(id);

-- 7. Functions & Triggers
-- Automatically update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_progress_modtime BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
