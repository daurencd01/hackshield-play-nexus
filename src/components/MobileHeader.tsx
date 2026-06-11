import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Bell } from 'lucide-react';
import { useState } from 'react';

interface Props {
  title?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function MobileHeader({ title, showBack, rightContent }: Props) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-[#00ff88]/20 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center -ml-2 active:scale-90"
              >
                <ArrowLeft className="w-5 h-5 text-[#00ff88]" />
              </button>
            ) : (
              <button
                onClick={() => setShowMenu(true)}
                className="w-9 h-9 flex items-center justify-center -ml-2 active:scale-90"
              >
                <Menu className="w-5 h-5 text-[#00ff88]" />
              </button>
            )}

            <h1 className="font-mono text-base text-white">
              {title || 'HackShield'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {rightContent}
            <button className="w-9 h-9 flex items-center justify-center relative active:scale-90">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* Side drawer menu */}
      {showMenu && <MobileMenu onClose={() => setShowMenu(false)} />}
    </>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 md:hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />

      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 bottom-0 w-72 bg-black border-r border-[#00ff88]/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Меню контент */}
        <div className="p-4">
          <div className="text-[#00ff88] font-mono text-xl mb-6">
            HACK<span className="text-white">SHIELD</span>
          </div>

          <nav className="space-y-4">
            <MenuLink label="Настройки" href="/settings" />
            <MenuLink label="Достижения" href="/achievements" />
            <MenuLink label="Помощь" href="/help" />
            <MenuLink label="О приложении" href="/about" />
            <div className="pt-4 border-t border-gray-800">
              <MenuLink label="Выход" href="/auth" color="text-red-500" />
            </div>
          </nav>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function MenuLink({ label, href, color = "text-gray-300" }: { label: string, href: string, color?: string }) {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate(href)}
      className={`block w-full text-left py-2 font-mono text-sm ${color} hover:text-white transition-colors`}
    >
      {label}
    </button>
  );
}
