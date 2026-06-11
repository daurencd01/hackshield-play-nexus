import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import GameScene from '@/components/GameScene';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Terminal, Shield, Zap, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type GameMode = 'none' | 'solo' | 'lobby' | 'in_game';

export default function Game2DPage() {
  const [mode, setMode] = useState<GameMode>('none');
  const [session, setSession] = useState<{ id: string; code: string; isHost: boolean } | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleJoinSession = (sessionId: string, roomCode: string, isHost: boolean) => {
    setSession({ id: sessionId, code: roomCode, isHost });
    setMode('in_game');
  };

  const startSolo = () => {
    setMode('in_game');
    setSession(null);
  };

  return (
    <Layout title="HackShield Play Nexus" hideNav={mode === 'in_game'}>
      <div className="flex-1 w-full flex flex-col bg-[#050505] text-white">
        
        {/* Main Selection Menu */}
        {mode === 'none' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Solo Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={startSolo}
                className="cursor-pointer bg-zinc-900/40 border border-white/5 p-10 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-emerald-500/30 transition-all"
              >
                <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                  <Terminal className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight">SINGLE PLAYER</h2>
                <p className="text-zinc-500 mb-10 leading-relaxed">
                  20 high-stakes missions. Infiltrate deep into corporate networks alone and test your stealth skills.
                </p>
                <div className="mt-auto flex gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span>Offline Mode</span>
                  <span>•</span>
                  <span>Full Progression</span>
                </div>
              </motion.div>

              {/* Multiplayer Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setMode('lobby')}
                className="cursor-pointer bg-zinc-900/40 border border-white/5 p-10 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-cyan-500/30 transition-all"
              >
                <div className="w-24 h-24 bg-cyan-500/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                  <Users className="w-12 h-12 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight">COOPERATIVE</h2>
                <p className="text-zinc-500 mb-10 leading-relaxed">
                  Join forces with another operative. Coordinate hacks, distract guards, and escape together.
                </p>
                <div className="mt-auto flex gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span>Real-time Sync</span>
                  <span>•</span>
                  <span>Shared XP</span>
                </div>
              </motion.div>

            </div>
          </div>
        )}

        {/* Lobby View */}
        {mode === 'lobby' && user && (
          <div className="flex-1 flex flex-col items-center p-8">
            <button 
              onClick={() => setMode('none')}
              className="self-start flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12"
            >
              <ChevronLeft className="w-5 h-5" />
              BACK TO MENU
            </button>
            <MultiplayerLobby userId={user.id} onJoin={handleJoinSession} />
          </div>
        )}

        {/* Game Scene */}
        {mode === 'in_game' && user && (
          <div className="flex-1 relative flex flex-col">
             {/* Header UI during game */}
             <div className="p-2 sm:p-4 flex items-center justify-between gap-2 bg-black/40 backdrop-blur border-b border-white/5">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                   <button onClick={() => setMode('none')} className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0">
                      <ChevronLeft className="w-5 h-5" />
                   </button>
                   <div className="hidden sm:block h-6 w-px bg-white/10" />
                   <div className="text-[10px] sm:text-xs font-mono uppercase sm:tracking-widest text-zinc-500 truncate">
                      <span className="hidden sm:inline">SESSION: </span><span className="text-white">{session?.code || 'LOCAL_SOLO'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                   <div className="flex items-center gap-1.5 sm:gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <div className="w-16 sm:w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[100%]" />
                      </div>
                   </div>
                   <div className="flex items-center gap-1.5 sm:gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] sm:text-xs font-mono text-cyan-400">2450</span>
                   </div>
                </div>
             </div>

             <div className="flex-1 flex items-center justify-center p-1 sm:p-4">
                <GameScene 
                  userId={user.id}
                  username={user.email?.split('@')[0] || 'Operative'}
                  sessionId={session?.id}
                  roomId={0} // Start from tutorial
                  mode={session ? 'coop' : 'solo'}
                  isHost={session ? session.isHost : true}
                />
             </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
