import { Link, useLocation } from "react-router-dom";
import { currentPlayer } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import { Shield, Swords, Users, User, Trophy } from "lucide-react";

const navItems = [
  { path: "/", label: "HQ", icon: Shield },
  { path: "/missions", label: "Missions", icon: Swords },
  { path: "/arena", label: "Arena", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/achievements", label: "Badges", icon: Trophy },
];

const GameHeader = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-orbitron text-xl font-bold text-primary text-glow-green">
            HACK<span className="text-secondary">SHIELD</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary box-glow-green"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="font-mono text-xs text-muted-foreground">LVL</span>
            <span className="font-orbitron text-sm font-bold text-primary">{currentPlayer.level}</span>
            <div className="w-20">
              <Progress value={(currentPlayer.xp / currentPlayer.xpToNext) * 100} className="h-1.5" />
            </div>
            <span className="font-mono text-xs text-neon-yellow">{currentPlayer.xp} XP</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-lg">
            {currentPlayer.avatar}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex justify-around border-t border-border py-1 md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 p-1 text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default GameHeader;
