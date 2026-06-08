import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QuizQuestion, quizService } from "@/services/quizService";
import { Button } from "@/components/ui/button";
import { Timer, Send, X, CheckCircle2, AlertCircle, Lightbulb, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface QuizModalProps {
  question: QuizQuestion;
  onClose: () => void;
  onResult: (isCorrect: boolean, xpEarned: number) => void;
}

export default function QuizModal({ question, onClose, onResult }: QuizModalProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(question.time_limit_seconds);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (result) {
        if (e.key === 'Enter' || e.key === ' ') {
          onResult(result.is_correct, result.xp_earned);
          onClose();
        }
        return;
      }
      if (submitting) return;
      
      if (e.key >= '1' && e.key <= '4') {
        setSelected(parseInt(e.key) - 1);
      } else if (e.key === 'Enter' && selected !== null) {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHint(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, result, submitting]);

  // Timer
  useEffect(() => {
    if (result || submitting) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, submitting]);

  const handleSubmit = async () => {
    if (submitting || result) return;
    setSubmitting(true);
    
    const timeSpent = question.time_limit_seconds - timeLeft;
    const res = await quizService.submitQuizAnswer(
      user?.id || '',
      question.id,
      question.room_id,
      selected ?? -1,
      timeSpent
    );

    setResult(res);
    setSubmitting(false);
  };

  const difficultyColor = {
    easy: "text-green-400 border-green-500/30 bg-green-500/5",
    medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    hard: "text-orange-400 border-orange-500/30 bg-orange-500/5",
    expert: "text-red-400 border-red-500/30 bg-red-500/5",
  }[question.difficulty];

  const timerColor = timeLeft < 5 ? "text-red-500" : timeLeft < 15 ? "text-yellow-500" : "text-green-500";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative max-w-lg w-full bg-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,255,136,0.1)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${difficultyColor}`}>
              {question.difficulty}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Timer className={`w-4 h-4 ${timerColor}`} />
              <span className={timerColor}>{timeLeft}s</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {!result ? (
            <>
              <h3 className="text-xl text-white font-bold mb-8 leading-relaxed">
                {question.question_text}
              </h3>

              <div className="grid gap-3">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelected(idx)}
                    className={`group relative p-4 rounded-xl border text-left transition-all duration-200 ${
                      selected === idx 
                        ? "border-[#00ff88] bg-[#00ff88]/10 text-white" 
                        : "border-white/5 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        selected === idx ? "bg-[#00ff88] text-black" : "bg-black/40 text-gray-500 group-hover:text-gray-300"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  {question.hint && (
                    <button 
                      onClick={() => setShowHint(!showHint)}
                      className={`flex items-center gap-1 text-xs transition-colors ${showHint ? 'text-[#00ff88]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      {showHint ? "HIDE HINT" : "SHOW HINT (H)"}
                    </button>
                  )}
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                    System Response Required
                  </span>
                </div>

                <AnimatePresence>
                  {showHint && question.hint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl text-xs text-[#00ff88]/80 italic"
                    >
                      HINT: {question.hint}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleSubmit}
                  disabled={selected === null || submitting}
                  className="w-full h-12 bg-[#00ff88] hover:bg-[#00cc77] text-black font-bold text-lg shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      SUBMIT ANSWER
                    </div>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {result.is_correct ? (
                <div className="mb-6">
                  <CheckCircle2 className="w-16 h-16 text-[#00ff88] mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-[#00ff88]">ACCESS GRANTED</h2>
                </div>
              ) : (
                <div className="mb-6">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-500">ACCESS DENIED</h2>
                </div>
              )}

              <div className="bg-white/5 p-6 rounded-2xl mb-8 text-left border border-white/5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-gray-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
                
                {question.source && (
                  <div className="mb-4 text-[10px] text-gray-600 uppercase tracking-wider font-bold border-t border-white/5 pt-4">
                    SOURCE: {question.source}
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-bold pt-4 border-t border-white/5">
                  <span className="text-gray-500 uppercase tracking-widest">Protocol Reward</span>
                  <span className="text-[#00ff88] font-mono">+ {result.xp_earned} XP</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  onResult(result.is_correct, result.xp_earned);
                  onClose();
                }}
                className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold"
              >
                CONTINUE
              </Button>
            </motion.div>
          )}
        </div>

        {/* Timer Bar */}
        {!result && (
          <div className="h-1 bg-white/5">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: `${(timeLeft / question.time_limit_seconds) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
              className={`h-full ${timerColor.replace('text', 'bg')}`}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
