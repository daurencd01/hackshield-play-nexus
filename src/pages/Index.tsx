import { Layout } from '@/components/Layout';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';
import { Target, Gamepad2, Trophy, ChevronRight, Zap, Shield } from 'lucide-react';
import { getRank, getLevel } from '@/components/ui/StatusComponents';
import { useTranslation } from 'react-i18next';

export default function Index() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useTranslation() as any;

  const rank = getRank(user?.xp || 0);
  const level = getLevel(user?.xp || 0);
  const nextLevelXp = (level + 1) * 1000; // Simplified xp formula for display
  const currentLevelXp = user?.xp || 0;
  const progress = Math.min(100, (currentLevelXp % 1000) / 10);

  return (
    <Layout title={t('nav.hq')}>
      <div className="px-4 py-4 md:px-8 md:py-6 max-w-7xl mx-auto">

        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-cyber rounded-2xl p-4 md:p-6 mb-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-gray-400 text-xs md:text-sm font-mono mb-1 tracking-widest uppercase">
                {t('dashboard.welcome')}
              </p>
              <h2 className="text-white text-xl md:text-3xl font-orbitron font-bold text-glow-blue">
                {user?.username || t('profile.role_operative')}
              </h2>
            </div>
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-[#00ff88]/20 border-2 border-[#00ff88] flex items-center justify-center box-glow-green">
              <Shield className="w-7 h-7 md:w-10 md:h-10 text-[#00ff88]" />
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-[10px] md:text-xs font-mono mb-1.5">
              <span className={`uppercase font-bold ${rank.color}`}>{rank.label} · LVL {level}</span>
              <span className="text-[#00ff88]">{currentLevelXp.toLocaleString()} XP</span>
            </div>
            <div className="h-2.5 bg-gray-900/50 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#00ff88] to-cyan-400 rounded-full relative"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-scan-line" style={{ backgroundSize: '200% 100%' }} />
              </motion.div>
            </div>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-[#00ff88]/5 rounded-full blur-3xl pointer-events-none" />
        </motion.div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <QuickCard
            icon={Gamepad2}
            label={t('dashboard.start_game')}
            sublabel={t('dashboard.simulator_sub')}
            color="text-[#00ff88]"
            borderColor="border-[#00ff88]"
            bgColor="bg-[#00ff88]/10"
            onClick={() => navigate('/2d-game')}
            highlight
          />
          <QuickCard
            icon={Target}
            label={t('dashboard.missions')}
            sublabel={t('dashboard.missions_sub')}
            color="text-yellow-400"
            borderColor="border-yellow-400/40"
            bgColor="bg-yellow-400/5"
            onClick={() => navigate('/missions')}
          />
          <QuickCard
            icon={Trophy}
            label={t('dashboard.arena')}
            sublabel={t('dashboard.arena_sub')}
            color="text-purple-400"
            borderColor="border-purple-400/40"
            bgColor="bg-purple-400/5"
            onClick={() => navigate('/arena')}
            className="col-span-2 md:col-span-1"
          />
        </div>

        {/* Daily challenge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-4 md:p-5 mb-6 border-white/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-[10px] font-mono uppercase tracking-widest font-bold">
              {t('dashboard.daily_title')}
            </span>
          </div>
          <h3 className="text-white text-base md:text-lg font-orbitron mb-3">
            {t('dashboard.daily_task')}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[#00ff88] font-orbitron text-2xl font-black">3/5</div>
              <div className="text-gray-500 text-[10px] font-mono uppercase">{t('dashboard.daily_reward')}</div>
            </div>
            <button className="px-5 py-2 bg-[#00ff88]/10 border border-[#00ff88]/40 text-[#00ff88] text-[10px] font-mono font-bold uppercase rounded-lg tap-scale hover:bg-[#00ff88]/20 transition-all">
              {t('dashboard.btn_continue')}
            </button>
          </div>
        </motion.div>

        {/* Recent activity */}
        <section>
          <h3 className="text-gray-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4 px-1">
            {t('dashboard.recent_activity')}
          </h3>
          <div className="space-y-2.5">
            <ActivityItem
              icon="🎯"
              title={t('dashboard.act_mission')}
              time={t('dashboard.act_mission_time')}
              xp={150}
            />
            <ActivityItem
              icon="🏆"
              title={t('dashboard.act_badge')}
              time={t('dashboard.act_badge_time')}
              xp={50}
            />
            <ActivityItem
              icon="🎮"
              title={t('dashboard.act_rooms')}
              time={t('dashboard.act_rooms_time')}
              xp={120}
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}

function QuickCard({ icon: Icon, label, sublabel, color, borderColor, bgColor, onClick, highlight, className = '' }: any) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-4 md:p-5 text-left border transition-all
        ${highlight
          ? `${bgColor} ${borderColor} box-glow-green`
          : `glass border-white/5 hover:border-white/20`}
        ${className}
      `}
    >
      <Icon className={`w-6 h-6 md:w-8 md:h-8 ${color} mb-2.5`} />
      <div className="text-white font-orbitron text-xs md:text-sm font-bold mb-0.5 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-gray-500 text-[10px] font-mono uppercase">{sublabel}</div>

      {highlight && (
        <ChevronRight className={`absolute top-4 right-4 w-5 h-5 ${color} opacity-60`} />
      )}
    </motion.button>
  );
}

function ActivityItem({ icon, title, time, xp }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass rounded-xl p-3.5 flex items-center gap-3.5 border-white/5"
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-mono font-bold truncate uppercase tracking-tight">{title}</div>
        <div className="text-gray-500 text-[9px] font-mono uppercase mt-0.5">{time}</div>
      </div>
      <div className="text-[#00ff88] font-orbitron text-[10px] font-bold">+{xp} XP</div>
    </motion.div>
  );
}
