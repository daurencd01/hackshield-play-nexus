import { useLocation } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import GameHeader from './GameHeader'; // десктопный header

interface Props {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  hideNav?: boolean;
}

export function Layout({ children, title, showBack, hideNav }: Props) {
  const location = useLocation();
  const isGamePage = location.pathname === '/2d-game';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Mobile header (hidden in immersive/game mode) */}
      {!hideNav && <MobileHeader title={title} showBack={showBack} />}

      {/* Desktop header */}
      {!hideNav && (
        <div className="hidden md:block">
          <GameHeader />
        </div>
      )}

      {/* Main content with padding for mobile nav */}
      <main
        className={`
          flex-1
          ${!hideNav ? 'pb-20 md:pb-0' : ''}
          ${isGamePage ? 'overflow-hidden' : ''}
        `}
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      {!hideNav && <MobileBottomNav />}
    </div>
  );
}
