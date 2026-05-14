import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Clock, Lightbulb, ChevronRight, Terminal, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { missionScenario, scenarios } from "@/data/defaultData";
import { Scenario, ScenarioStep } from "@/types/scenario";
import { useScenarioEngine } from "@/hooks/useScenarioEngine";
import { LoadingScreen } from "./LoadingScreen";

export interface ScenarioPlayerProps {
  missionId: string;
  onComplete: (totalXp: number) => void;
}

export default function ScenarioPlayer({ missionId, onComplete }: ScenarioPlayerProps) {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);

  // Load scenarios from mockData
  useEffect(() => {
    // try to find by category/id, else fallback to missionScenario
    const specificScenario = scenarios.find((s) => s.id === missionId);
    if (specificScenario) {
      setCurrentScenario(specificScenario);
    } else {
      // Fallback
      setCurrentScenario({
        id: missionId,
        title: "Сценарий",
        description: "",
        difficulty: "medium",
        category: "network",
        steps: missionScenario
      });
    }
  }, [missionId]);

  const { state, dispatch } = useScenarioEngine(
    currentScenario || { id: 'loading', title: '', description: '', difficulty: 'medium', category: 'network', steps: [] }, 
    missionId
  );

  if (!currentScenario || state.steps.length === 0) {
    return <LoadingScreen />;
  }

  if (state.isCompleted) {
    // Notify parent
    useEffect(() => {
      onComplete(state.totalXp);
    }, []);
    return null; // The parent (MissionPlay) shows the completion screen
  }

  const currentStep = state.steps[state.currentIndex];
  if (!currentStep) return null;

  const handleNext = () => dispatch({ type: "NEXT_STEP" });

  const renderStepContent = () => {
    switch (currentStep.type) {
      case "narrative":
      case "outcome":
      case "terminal":
      case "log":
      case "dialogue":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-5 w-5 text-primary" />
              <span className="font-orbitron font-bold text-primary uppercase tracking-widest">
                {currentStep.type === "terminal" ? "Terminal output" : ("speaker" in currentStep && currentStep.speaker ? currentStep.speaker : "System")}
              </span>
            </div>
            <p className="font-mono text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {"text" in currentStep ? currentStep.text : currentStep.content}
            </p>
            <Button onClick={handleNext} className="mt-6 bg-secondary hover:bg-secondary/80 font-orbitron text-xs uppercase text-secondary-foreground">
              Продолжить <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case "situation":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-neon-yellow" />
                <span className="font-orbitron font-bold text-neon-yellow uppercase tracking-widest">Критическая ситуация</span>
              </div>
              {state.timeRemaining !== null && (
                <div 
                  className="flex items-center gap-1.5 text-destructive font-mono text-sm"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="sr-only">Осталось времени:</span>
                  <Clock className="h-4 w-4" /> 00:{state.timeRemaining.toString().padStart(2, "0")}
                </div>
              )}
            </div>

            <p className="font-mono text-sm text-foreground/90">
              {currentStep.text || currentStep.question}
            </p>

            {!state.feedback ? (
              <div className="space-y-3">
                {(currentStep.choices || currentStep.options || []).map((choice: any, idx) => {
                  const id = choice.id || `opt-${idx}`;
                  const text = choice.text;
                  const consequence = choice.consequence || choice.explanation;
                  const xp = choice.xpGain || choice.xpAward || 0;
                  const isOptimal = choice.isOptimal !== undefined ? choice.isOptimal : choice.isCorrect;

                  return (
                    <button
                      key={id}
                      onClick={() => dispatch({ type: "SELECT_CHOICE", choiceId: id, xp, consequence, isOptimal })}
                      className="w-full text-left rounded-lg border border-primary/30 bg-card/40 p-4 hover:bg-primary/10 hover:border-primary/60 transition-all font-mono text-sm group"
                    >
                      <span className="inline-block w-6 text-primary/50 group-hover:text-primary">[{idx + 1}]</span>
                      {text}
                    </button>
                  );
                })}

                <div className="pt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => dispatch({ type: "USE_HINT" })} className="font-orbitron text-[10px] text-muted-foreground hover:text-primary border-primary/20">
                    <Lightbulb className="mr-1.5 h-3 w-3" /> Подсказка (-10 XP)
                  </Button>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-4 ${state.feedback.isCorrect ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {state.feedback.isCorrect ? <CheckCircle className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <span className={`font-orbitron font-bold text-sm uppercase ${state.feedback.isCorrect ? "text-primary" : "text-destructive"}`}>
                    {state.feedback.isCorrect ? "Успех" : "Неоптимальный выбор"}
                  </span>
                </div>
                <p 
                  className="font-mono text-sm text-foreground/80 mb-4"
                  aria-live="assertive"
                >
                  {state.feedback.message}
                </p>
                <Button onClick={handleNext} className="w-full bg-secondary hover:bg-secondary/80 font-orbitron text-xs uppercase text-secondary-foreground">
                  Далее <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        );

      case "result":
        return (
          <div className="text-center space-y-4 py-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="font-orbitron text-2xl text-primary font-bold">Сценарий завершен</h2>
            <p className="font-mono text-muted-foreground">{currentStep.content}</p>
            <Button onClick={handleNext} className="mt-6 bg-primary hover:bg-primary/80 font-orbitron text-xs uppercase text-primary-foreground">
              Завершить
            </Button>
          </div>
        );

      default:
        return <div>Неизвестный тип шага</div>;
    }
  };

  return (
    <motion.div
      key={currentStep.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl mt-8"
    >
      <div className="rounded-xl border border-border bg-card/60 p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header HUD */}
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-2">
          <div className="font-mono text-xs text-muted-foreground">
            ШАГ: <span className="text-primary">{state.currentIndex + 1} / {state.steps.length}</span>
          </div>
          <div className="font-orbitron text-xs font-bold text-neon-yellow">
            ОЧКИ: {state.totalXp} XP
          </div>
        </div>

        {renderStepContent()}
      </div>
    </motion.div>
  );
}
