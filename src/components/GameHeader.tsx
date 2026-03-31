import { Link, useLocation } from "react-router-dom";
import { currentPlayer } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import { Shield, Swords, Users, User, Trophy } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";

const navItems = [
  { path: "/", key: "nav.hq", icon: Shield },
  { path: "/missions", key: "nav.missions", icon: Swords },
  { path: "/arena", key: "nav.arena", icon: Users },
  { path: "/profile", key: "nav.profile", icon: User },
  { path: "/achievements", key: "nav.badges", icon: Trophy },
];

export default function GameHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation() as any;
  const { user } = useUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const xp = user?.xp ?? currentPlayer.xp;
  const level = user ? Math.floor(user.xp / 1000) + 1 : currentPlayer.level;
  const xpToNext = user ? level * 1000 : currentPlayer.xpToNext;
  const progressRatio = user ? ((xp % 1000) / 1000) * 100 : (xp / xpToNext) * 100;

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
                {t(item.key as any)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="font-mono text-xs text-muted-foreground">{t("header.lvl")}</span>
            <span className="font-orbitron text-sm font-bold text-primary">{level}</span>
            <div className="w-20">
              <Progress value={progressRatio} className="h-1.5" />
            </div>
            <span className="font-mono text-xs text-neon-yellow">{xp} {t("header.xp")}</span>
          </div>
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-lg hover:bg-primary/20 transition-colors focus:outline-none">
                {user?.username?.charAt(0).toUpperCase() || currentPlayer.avatar}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-primary/50 bg-background/95 backdrop-blur-xl">
              <DropdownMenuLabel className="font-orbitron text-primary">
                {user?.username || "Guest"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-primary/20 focus:bg-primary/20">
                <Link to="/profile" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-primary/20 focus:bg-primary/20">
                <Link to="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive hover:bg-destructive/20 focus:bg-destructive/20 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              {t(item.key as any)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
