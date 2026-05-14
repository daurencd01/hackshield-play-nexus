import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { Layout } from '@/componentsLayout';
import {
  usePublicProfile,
  useUserAchievements,
  useRecentMissions
} from '@/hooks/useUserProfile';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';
import { friendsService } from '@/services/friendsService';
import { chatService } from '@/services/chatService';
import { getRank, getLevelProgress, getNextRank } from '@/components/ui/StatusComponents';
import {
  MessageCircle, UserPlus, UserCheck, Clock,
  Trophy, Target, Award, Calendar, Globe,
  ArrowLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function UserProfile() {
  const { idOrUsername } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading } = usePublicProfile(idOrUsername);
  const { data: achievements = [] } = useUserAchievements(profile?.id, 6);
  const { data: missions = [] } = useRecentMissions(profile?.id, 5);
  const friendshipStatus = useFriendshipStatus(profile?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h1 className="text-2xl font-mono text-white mb-2">Профиль не найден</h1>
        <p className="text-gray-500 mb-6">Пользователь с таким именем не зарегистрирован в системе.</p>
        <button 
          onClick={() => navigate('/arena')}
          className="px-6 py-2 bg-cyber-green text-black font-mono rounded-lg"
        >
          Вернуться в Арену
        </button>
      </div>
    );
  }

  const isMyProfile = user?.id === profile.id;
  const rank = getRank(profile.xp || 0);
  const nextRank = getNextRank(profile.xp || 0);
  const progress = getLevelProgress(profile.xp || 0);

  const handleAddFriend = async () => {
    const result = await friendsService.sendRequest(profile.id);
    if (result.success) {
      toast({
        title: "Заявка отправлена",
        description: `Запрос в друзья отправлен игроку ${profile.username}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: result.error || "Не удалось отправить заявку",
      });
    }
  };

  const handleStartChat = async () => {
    const chatId = await chatService.getOrCreateChat(profile.id);
    if (chatId) navigate(`/chat/${chatId}`);
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* === HEADER === */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-white font-mono text-sm font-bold truncate">Профиль игрока</h1>
      </header>

      <div className="pt-14">
        {/* === COVER + AVATAR === */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-cyber-green/20 via-purple-500/10 to-pink-500/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,rgba(0,255,136,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,255,136,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>

          <div className="px-4 -mt-12 relative z-10">
            <div className="flex flex-col gap-3">
              <div className="relative w-24 h-24">
                <div className="w-full h-full rounded-2xl border-4 border-black bg-cyber-green/20 overflow-hidden flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-mono text-cyber-green">
                      {profile.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {profile.is_online && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 border-4 border-black rounded-full" />
                )}
              </div>

              <div>
                <h2 className="text-white font-mono text-xl font-bold">{profile.username}</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`${rank.color} font-mono`}>{rank.label}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-400 font-mono">LVL {profile.level}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Actions */}
              {!isMyProfile && (
                <div className="flex gap-2 mt-2">
                  {friendshipStatus === 'friends' ? (
                    <button
                      onClick={handleStartChat}
                      className="flex-1 flex items-center justify-center gap-2 h-11 bg-cyber-green text-black font-mono text-sm font-bold rounded-xl active:scale-95 transition-transform"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Написать
                    </button>
                  ) : friendshipStatus === 'request_sent' ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/5 border border-white/10 text-yellow-500 font-mono text-sm rounded-xl"
                    >
                      <Clock className="w-4 h-4" />
                      Ожидание
                    </button>
                  ) : friendshipStatus === 'request_received' ? (
                    <button
                      onClick={() => navigate('/arena?tab=requests')}
                      className="flex-1 flex items-center justify-center gap-2 h-11 bg-blue-500 text-white font-mono text-sm font-bold rounded-xl active:scale-95 transition-transform"
                    >
                      <UserCheck className="w-4 h-4" />
                      Ответить
                    </button>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      className="flex-1 flex items-center justify-center gap-2 h-11 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green font-mono text-sm font-bold rounded-xl active:scale-95 transition-transform"
                    >
                      <UserPlus className="w-4 h-4" />
                      В друзья
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === STATS === */}
        <div className="px-4 mt-8 grid grid-cols-3 gap-3">
          <StatCard
            icon={Trophy}
            label="Место"
            value={`#${profile.global_rank}`}
            color="text-yellow-400"
          />
          <StatCard
            icon={Target}
            label="Миссии"
            value={profile.xp > 0 ? Math.floor(profile.xp / 100) : 0} 
            color="text-cyber-green"
          />
          <StatCard
            icon={Award}
            label="Ачивки"
            value={profile.achievements_count}
            color="text-purple-400"
          />
        </div>

        {/* Progress */}
        <div className="px-4 mt-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest mb-2">
              <span className={rank.color}>{rank.label}</span>
              {nextRank && <span className="text-gray-500">{nextRank.label}</span>}
            </div>
            <div className="h-1.5 bg-black rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full bg-gradient-to-r from-cyber-green to-emerald-500`}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-500">
              <span>{profile.xp.toLocaleString()} XP</span>
              {nextRank && <span>до след. ранга {nextRank.minXp - profile.xp} XP</span>}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <section className="mt-10 px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-xs font-mono uppercase tracking-wider">Достижения</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map(ach => (
                <div key={ach.achievement_id} className="aspect-square bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-2xl" title={ach.title_ru}>
                  {ach.icon || '🏆'}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Missions */}
        {missions.length > 0 && (
          <section className="mt-10 px-4">
            <h3 className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-4">Недавние операции</h3>
            <div className="space-y-2">
              {missions.map(m => (
                <div key={m.mission_id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyber-green/10 flex items-center justify-center text-cyber-green">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-mono truncate">{m.title_ru}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-tighter">
                      {formatDistanceToNow(new Date(m.completed_at), { addSuffix: true, locale: ru })}
                    </div>
                  </div>
                  <div className="text-cyber-green font-mono text-xs">+{m.xp_reward}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <section className="mt-10 px-4 pb-12">
          <h3 className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-4">Инфо-лист</h3>
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
            {profile.country && (
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-500" />
                <div className="flex-1 text-xs">
                  <span className="text-gray-500">Регион: </span>
                  <span className="text-white">{profile.country}</span>
                </div>
              </div>
            )}
            {profile.joined_at && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div className="flex-1 text-xs">
                  <span className="text-gray-500">В системе: </span>
                  <span className="text-white">{format(new Date(profile.joined_at), 'dd.MM.yyyy')}</span>
                </div>
              </div>
            )}
            {!profile.is_online && profile.last_seen_at && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div className="flex-1 text-xs">
                  <span className="text-gray-500">Был в сети: </span>
                  <span className="text-white">{formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: ru })}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <div className={`text-white font-mono text-sm font-bold`}>{value}</div>
      <div className="text-gray-500 text-[10px] uppercase tracking-tighter">{label}</div>
    </div>
  );
}
