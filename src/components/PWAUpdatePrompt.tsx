import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service worker registered');
      // Проверять обновления каждый час
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration error:', error);
    }
  });

  useEffect(() => {
    if (needRefresh || offlineReady) setShowPrompt(true);
  }, [needRefresh, offlineReady]);

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50"
        >
          <div className="bg-black border border-[#00ff88]/40 rounded-xl p-4 shadow-2xl shadow-[#00ff88]/20">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-[#00ff88] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {needRefresh ? (
                  <>
                    <h3 className="text-[#00ff88] font-mono text-sm mb-1">
                      Доступно обновление
                    </h3>
                    <p className="text-gray-400 text-xs mb-3">
                      Перезапустите приложение для применения изменений
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateServiceWorker(true)}
                        className="flex-1 px-3 py-1.5 bg-[#00ff88] text-black text-xs font-mono rounded"
                      >
                        Обновить
                      </button>
                      <button
                        onClick={close}
                        className="px-3 py-1.5 border border-gray-600 text-gray-400 text-xs font-mono rounded"
                      >
                        Позже
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-[#00ff88] font-mono text-sm mb-1">
                      Готово к работе офлайн
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Приложение установлено и доступно без интернета
                    </p>
                  </>
                )}
              </div>
              <button onClick={close} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
