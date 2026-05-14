import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Target, Gamepad2, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Штаб' },
  { path: '/missions', icon: Target, label: 'Миссии' },
  { path: '/2d-game', icon: Gamepad2, label: 'Игра', highlight: true },
  { path: '/arena', icon: Trophy, label: 'Арена' },
  { path: '/profile', icon: User, label: 'Профиль' }
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-[#00ff88]/20" />

      <div className="relative flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path;

          return (
            <NavLink
              key={path}
              to={path}
              className="relative flex flex-col items-center justify-center flex-1 h-full active:scale-90 transition-transform"
              aria-label={label}
            >
              {/* Активный индикатор сверху */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#00ff88] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Highlight кнопка для главного действия */}
              {highlight ? (
                <div className={`
                  relative flex items-center justify-center w-12 h-12 rounded-2xl -mt-4
                  ${isActive
                    ? 'bg-[#00ff88] shadow-lg shadow-[#00ff88]/50'
                    : 'bg-[#00ff88]/20 border-2 border-[#00ff88]'}
                  transition-all
                `}>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-black' : 'text-[#00ff88]'}`} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#00ff88]' : 'text-gray-500'}`} />
                  <span className={`text-[10px] font-mono ${isActive ? 'text-[#00ff88]' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
