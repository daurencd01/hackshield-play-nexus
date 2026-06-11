import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Zap, Globe, Lock, Play } from 'lucide-react';
import { gameSessionService } from '@/services/gameSessionService';
import { useToast } from '@/hooks/use-toast';

interface MultiplayerLobbyProps {
  userId: string;
  onJoin: (sessionId: string, roomCode: string, isHost: boolean) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ userId, onJoin }) => {
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const { toast } = useToast();

  const handleCreate = async () => {
    setLoading(true);
    const data = await gameSessionService.createSession(userId, true);
    if (data && data.session_id) {
      onJoin(data.session_id, data.room_code, true);
    } else {
      toast({ title: 'Error', description: 'Failed to create session', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (roomCode.length !== 6) return;
    setLoading(true);
    const result = await gameSessionService.joinSession(userId, roomCode);
    if (result && result.success) {
      onJoin(result.session_id, roomCode.toUpperCase(), false);
    } else {
      toast({ title: 'Access Denied', description: result.message || 'Invalid room code', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Create Session */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all group"
        >
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Globe className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Host Operation</h3>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            Initialize a secure encrypted channel and invite a partner for a coordinated infiltration.
          </p>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(8,145,178,0.3)]"
          >
            {loading ? <Zap className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            INITIALIZE SESSION
          </button>
        </motion.div>

        {/* Join Session */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all group"
        >
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Join Operation</h3>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            Enter the 6-character decryption key provided by your partner to establish a uplink.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-white focus:border-purple-500 outline-none transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={loading || roomCode.length !== 6}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
            >
              <Users className="w-5 h-5" />
              ESTABLISH UPLINK
            </button>
          </div>
        </motion.div>

      </div>

      {/* Benefits / Info */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: "Co-op Tactics", desc: "One distracts guards, one hacks the vault." },
          { icon: Zap, title: "Shared XP", desc: "Both players earn 100% rewards for success." },
          { icon: Globe, title: "Global Sync", desc: "Real-time state synchronization via Nexus." }
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <item.icon className="w-6 h-6 text-zinc-500 mt-1 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-zinc-300">{item.title}</h4>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
