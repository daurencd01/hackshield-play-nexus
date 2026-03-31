import { useState } from "react";
import { ScenarioStep } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, MessageSquare, AlertTriangle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScenarioPlayerProps {
  steps: ScenarioStep[];
  onComplete: (totalXp: number) => void;
}

const ScenarioPlayer = ({ steps, onComplete }: ScenarioPlayerProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showConsequence, setShowConsequence] = useState(false);
  const [totalXP, setTotalXP] = useState(0);

  const step = steps[currentStepIndex];
  if (!step) return null;

  const handleChoice = (choiceId: string) => {
    const choice = step.choices?.find((c) => c.id === choiceId);
    if (!choice) return;
    setSelectedChoice(choiceId);
    setShowConsequence(true);
    setTotalXP((prev) => prev + choice.xpGain);
  };

  const handleNext = () => {
    setSelectedChoice(null);
    setShowConsequence(false);
    if (currentStepIndex >= steps.length - 1) {
      onComplete(totalXP);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const getStepIcon = () => {
    switch (step.type) {
      case "terminal": return <Terminal className="h-5 w-5 text-primary" />;
      case "situation": return <AlertTriangle className="h-5 w-5 text-neon-yellow" />;
      case "outcome": return <Award className="h-5 w-5 text-neon-purple" />;
      default: return <MessageSquare className="h-5 w-5 text-accent" />;
    }
  };

  const getStepBorder = () => {
    switch (step.type) {
      case "terminal": return "border-primary/40 box-glow-green";
      case "situation": return "border-neon-yellow/40";
      case "outcome": return "border-neon-purple/40 box-glow-purple";
      default: return "border-accent/40 box-glow-blue";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>ШАГИ: {currentStepIndex + 1} / {steps.length}</span>
        <span className="text-neon-yellow">+{totalXP} XP</span>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < currentStepIndex ? "bg-primary" : i === currentStepIndex ? "bg-secondary animate-pulse-glow" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`rounded-lg border p-5 ${getStepBorder()}`}
        >
          <div className="mb-3 flex items-center gap-2">
            {getStepIcon()}
            {step.speaker && (
              <span className="font-orbitron text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {step.speaker}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {step.type === "terminal" ? "[LOG]" : step.type === "situation" ? "[СИТУАЦИЯ]" : step.type === "outcome" ? "[РЕЗУЛЬТАТ]" : "[СВЯЗЬ]"}
            </span>
          </div>

          <p className={`text-sm leading-relaxed ${step.type === "terminal" ? "font-mono text-primary" : ""}`}>
            {step.text}
          </p>

          {/* Choices */}
          {step.type === "situation" && step.choices && !showConsequence && (
            <div className="mt-4 space-y-2">
              <p className="font-orbitron text-xs font-bold uppercase tracking-wider text-secondary">
                Что ты сделаешь?
              </p>
              {step.choices.map((choice) => (
                <motion.button
                  key={choice.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChoice(choice.id)}
                  className="w-full rounded-md border border-border bg-muted/30 p-3 text-left font-mono text-sm transition-all hover:border-secondary hover:bg-secondary/10"
                >
                  <span className="text-secondary">▸</span> {choice.text}
                </motion.button>
              ))}
            </div>
          )}

          {/* Consequence */}
          {showConsequence && selectedChoice && step.choices && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-3"
            >
              {step.choices
                .filter((c) => c.id === selectedChoice)
                .map((choice) => (
                  <div key={choice.id} className={`rounded-md border p-3 ${choice.isOptimal ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`font-orbitron text-xs font-bold ${choice.isOptimal ? "text-primary" : "text-destructive"}`}>
                        {choice.isOptimal ? "✓ ОПТИМАЛЬНОЕ РЕШЕНИЕ" : "✗ НЕ ЛУЧШИЙ ВЫБОР"}
                      </span>
                      <span className="font-mono text-xs text-neon-yellow">+{choice.xpGain} XP</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{choice.consequence}</p>
                  </div>
                ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      {(step.type !== "situation" || showConsequence) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
          <Button
            onClick={handleNext}
            className="font-orbitron text-xs uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            {currentStepIndex >= steps.length - 1 ? "Завершить миссию" : "Продолжить →"}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ScenarioPlayer;
