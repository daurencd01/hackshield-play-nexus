import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Показывать через 30 секунд использования (не сразу)
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
          setShow(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShow(false);
  };

  if (!show || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
      >
        <div className="bg-gradient-to-br from-black to-[#00ff88]/10 border-2 border-[#00ff88] rounded-xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-[#00ff88] rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-mono text-base mb-1">
                Установить HackShield
              </h3>
              <p className="text-gray-400 text-xs mb-3">
                Добавь приложение на главный экран для быстрого доступа и работы офлайн
              </p>
              <div className="flex gap-2">
                <button
                  onClick={install}
                  className="flex-1 px-4 py-2 bg-[#00ff88] text-black font-mono text-sm rounded-lg active:scale-95 transition"
                >
                  Установить
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2 border border-gray-600 text-gray-400 text-sm rounded-lg"
                >
                  Не сейчас
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
