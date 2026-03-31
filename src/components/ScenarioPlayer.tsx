/**
 * ScenarioPlayer — auth-aware wrapper around GameScene.
 *
 * Keeps the original `ScenarioPlayerProps` API:
 *   <ScenarioPlayer missionId="..." onComplete={(xp) => ...} />
 *
 * Handles:
 *   - Auth resolution (getUser)
 *   - Unauthenticated gate
 *   - Passes resolved userId into GameScene
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import GameScene from "@/components/GameScene";

export interface ScenarioPlayerProps {
  missionId: string;
  onComplete: (totalXp: number) => void;
}

export default function ScenarioPlayer({ missionId, onComplete }: ScenarioPlayerProps) {
  const navigate = useNavigate();
  // undefined = not yet resolved · null = unauthenticated · string = uid
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (cancelled) return;
      setUserId(error || !user ? null : user.id);
    });
    return () => { cancelled = true; };
  }, []);

  if (userId === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm text-muted-foreground">Проверка авторизации...</p>
      </div>
    );
  }

  if (userId === null) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card/60 p-8 text-center">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-secondary" />
        <h2 className="font-orbitron text-lg font-bold text-foreground">Требуется авторизация</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Войди в аккаунт, чтобы играть в сценарные миссии.
        </p>
        <Button
          onClick={() => navigate("/auth")}
          className="mt-6 font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          Войти
        </Button>
      </div>
    );
  }

  return (
    <GameScene
      missionId={missionId}
      userId={userId}
      onComplete={onComplete}
    />
  );
}
