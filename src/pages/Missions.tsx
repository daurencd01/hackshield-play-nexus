import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { missions } from '@/data/mockData';
import MissionCard from '@/components/MissionCard';
import { Search, Filter, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MissionsPage() {
  const { t } = useTranslation() as any;
  const [activeTab, setActiveTab] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = ['Все', 'Доступные', 'В процессе', 'Завершённые'];

  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'Все') return matchesSearch;
    if (activeTab === 'Доступные') return matchesSearch && m.status === 'available';
    if (activeTab === 'В процессе') return matchesSearch && m.status === 'in-progress';
    if (activeTab === 'Завершённые') return matchesSearch && m.status === 'completed';
    return matchesSearch;
  });

  return (
    <Layout title="Миссии">
      <div className="px-4 py-4 md:px-8 md:py-6 max-w-6xl mx-auto">
        
        {/* Search & Filter Header */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Поиск миссий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-mono focus:border-[#00ff88]/50 focus:outline-none transition-all"
            />
          </div>

          {/* Filter tabs (swipeable on mobile) */}
          <div className="flex gap-2 -mx-4 px-4 overflow-x-auto scrollbar-none no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-shrink-0 px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all
                  ${activeTab === tab 
                    ? 'bg-[#00ff88] text-black shadow-lg shadow-[#00ff88]/20' 
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Missions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMissions.map((mission, i) => (
              <motion.div
                key={mission.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <Link
                  to={mission.status !== "locked" ? `/mission/${mission.id}` : "#"}
                  className={`block transition-transform active:scale-[0.98] ${mission.status === 'locked' ? 'cursor-not-allowed grayscale' : ''}`}
                >
                  <div className="relative">
                    <MissionCard mission={mission} />
                    {mission.status === 'locked' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
                          <Lock className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredMissions.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-4xl mb-4 opacity-20">🔍</div>
            <h3 className="text-white font-orbitron text-lg mb-2">Ничего не найдено</h3>
            <p className="text-gray-500 font-mono text-xs">Попробуйте изменить поисковый запрос или фильтр</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
