import React, { useState } from "react";
import GameHeader from "@/components/GameHeader";
import GameScene from "@/components/GameScene";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function Game2DPage() {
  const [started, setStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      <GameHeader />
      <main className="flex-1 p-4 flex flex-col items-center">
        <h1 className="font-orbitron text-2xl font-bold text-primary mb-4 uppercase tracking-widest text-glow-green">
          2D Training Simulator
        </h1>
        <div className="w-full max-w-6xl flex-1 rounded-xl border border-primary/30 bg-[#0a0f18] shadow-2xl p-4 overflow-hidden relative flex flex-col">
          {!started ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="mb-8 font-mono text-muted-foreground max-w-lg">
                <p className="mb-4">Добро пожаловать в симулятор кибербезопасности. Вам предстоит управлять оперативником, выполнять задания и взаимодействовать с виртуальными системами.</p>
                <p>Управление: WASD / Стрелки для перемещения, E - взаимодействие.</p>
              </div>
              <Button 
                onClick={() => setStarted(true)}
                className="font-orbitron text-lg px-8 py-6 bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-105 uppercase tracking-wider"
              >
                <Play className="mr-3 h-6 w-6" /> Запустить симуляцию
              </Button>
            </div>
          ) : (
            <GameScene />
          )}
        </div>
      </main>
    </div>
  );
}
