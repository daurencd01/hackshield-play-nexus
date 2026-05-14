import { useState } from 'react';
import { Layout } from '@/components/Layout';
import GameScene from '@/components/GameScene';
import { Button } from '@/components/ui/button';
import { Play, Maximize2 } from 'lucide-react';
import { useCanvasSize } from '@/hooks/useCanvasSize';
import { OrientationOverlay } from '@/components/game/OrientationOverlay';
import { motion, AnimatePresence } from 'framer-motion';

export default function Game2DPage() {
  const [started, setStarted] = useState(false);
  const { width, height, isMobile } = useCanvasSize();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
      
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
        await (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
      setIsFullscreen(true);
    } catch (e) {
      console.warn('Fullscreen/Orientation lock not supported');
    }
  };

  return (
    <Layout title="2D Симулятор" hideNav={started && isMobile}>
      <div className={`
        flex-1 flex flex-col items-center 
        ${started && isMobile ? 'fixed inset-0 z-[60] bg-black' : 'p-4'}
      `}>
        
        {!started && (
          <div className="max-w-2xl w-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-cyber rounded-2xl p-8 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#00ff88]/10 border-2 border-[#00ff88] flex items-center justify-center mx-auto mb-6 box-glow-green">
                <Play className="w-10 h-10 text-[#00ff88] fill-[#00ff88]/20" />
              </div>
              
              <h1 className="font-orbitron text-2xl font-bold text-white mb-4 uppercase tracking-widest text-glow-blue">
                2D Training Simulator
              </h1>
              
              <div className="mb-8 font-mono text-sm text-gray-400 space-y-3">
                <p>Добро пожаловать в симулятор кибербезопасности. Вам предстоит управлять оперативником, выполнять задания и взаимодействовать с виртуальными системами.</p>
                <div className="pt-4 flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-widest">
                  <span className="px-3 py-1 bg-white/5 rounded border border-white/10">⌨️ WASD / Стрелки</span>
                  <span className="px-3 py-1 bg-white/5 rounded border border-white/10">🔘 Клавиша E</span>
                </div>
              </div>

              <Button 
                onClick={() => setStarted(true)}
                className="w-full md:w-auto font-orbitron text-lg px-12 py-7 bg-[#00ff88] hover:bg-[#00ff88]/80 text-black shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all hover:scale-105 uppercase tracking-widest font-black"
              >
                Запустить симуляцию
              </Button>
            </motion.div>
          </div>
        )}

        {started && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {isMobile && !isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="absolute top-4 right-4 z-[70] flex items-center gap-2 px-4 py-2 bg-black/60 border border-[#00ff88]/40 text-[#00ff88] text-[10px] font-mono font-bold uppercase rounded-lg backdrop-blur-md active:bg-[#00ff88]/20"
              >
                <Maximize2 className="w-4 h-4" />
                На весь экран
              </button>
            )}

            <div className="relative" style={{ width: width || '100%', height: height || '100%' }}>
              <GameScene />
            </div>

            <OrientationOverlay />
          </div>
        )}
      </div>
    </Layout>
  );
}
