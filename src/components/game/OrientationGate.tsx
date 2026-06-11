import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

/**
 * Wraps the 2D game. On phones it requests landscape (best-effort, works on
 * installed PWA / fullscreen) and shows a "rotate your device" prompt while the
 * screen is in portrait, since the stealth game is designed for landscape.
 */
export function OrientationGate({ children }: { children: React.ReactNode }) {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const update = () => setPortrait(mq.matches && window.innerWidth < 900);
    update();
    mq.addEventListener?.('change', update);
    window.addEventListener('resize', update);

    // Best-effort: lock to landscape (only succeeds in fullscreen / installed PWA).
    const orientation = (window.screen as any)?.orientation;
    try { orientation?.lock?.('landscape').catch(() => {}); } catch { /* unsupported */ }

    return () => {
      mq.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      try { orientation?.unlock?.(); } catch { /* noop */ }
    };
  }, []);

  return (
    <>
      {children}
      {portrait && (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center gap-6 text-center p-8 md:hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" />
            <RotateCw className="relative w-20 h-20 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Поверните телефон</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              2D-операция играется в горизонтальном режиме. Переверните устройство в&nbsp;альбомную ориентацию.
            </p>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70">LANDSCAPE MODE REQUIRED</p>
        </div>
      )}
    </>
  );
}
