import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';

export function OrientationOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 1024;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOverlay(isMobile && isPortrait);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center text-center p-8"
        >
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="mb-8"
          >
            <Smartphone className="w-20 h-20 text-[#00ff88]" />
          </motion.div>

          <h2 className="text-[#00ff88] text-2xl font-orbitron font-bold mb-4">
            ПОВЕРНИТЕ УСТРОЙСТВО
          </h2>
          <p className="text-gray-400 font-mono text-sm max-w-xs uppercase tracking-wider">
            Для лучшего игрового опыта используйте горизонтальную ориентацию
          </p>

          <button
            onClick={() => setShowOverlay(false)}
            className="mt-10 px-8 py-3 border border-gray-600 text-gray-400 text-xs font-mono font-bold uppercase rounded-lg active:bg-white/5 transition-all"
          >
            Продолжить в портретном режиме
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
