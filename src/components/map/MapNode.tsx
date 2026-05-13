import { motion } from "framer-motion";
import { CheckCircle, Lock, Terminal } from "lucide-react";
import { ScenarioRoom } from "@/components/ScenarioMap";

export type NodeState = "completed" | "current" | "locked";

interface MapNodeProps {
  room: ScenarioRoom;
  index: number;
  state: NodeState;
  onClick: () => void;
}

export function MapNode({ room, index, state, onClick }: MapNodeProps) {
  const isClickable = state !== "locked";

  const borderColor =
    state === "completed" ? "border-primary" :
    state === "current"   ? "border-secondary" :
                            "border-muted-foreground/30";

  const bgColor =
    state === "completed" ? "bg-primary/20" :
    state === "current"   ? "bg-secondary/15" :
                            "bg-muted/10";

  const iconColor =
    state === "completed" ? "text-primary" :
    state === "current"   ? "text-secondary" :
                            "text-muted-foreground/40";

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: state === "locked" ? 0.4 : 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={isClickable ? { scale: 1.12 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        relative flex flex-col items-center gap-1.5
        group focus:outline-none
        ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
      `}
      title={room.title}
    >
      {state === "current" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-secondary"
          animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div
        className={`
          relative flex h-14 w-14 items-center justify-center
          rounded-full border-2 transition-all duration-300
          ${borderColor} ${bgColor}
          ${state === "current" ? "shadow-lg shadow-secondary/30" : ""}
          ${state === "completed" ? "shadow-md shadow-primary/20" : ""}
        `}
      >
        {state === "completed" ? (
          <CheckCircle className={`h-6 w-6 ${iconColor}`} />
        ) : state === "locked" ? (
          <Lock className={`h-5 w-5 ${iconColor}`} />
        ) : (
          <Terminal className={`h-6 w-6 ${iconColor}`} />
        )}

        <div className={`
          absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center
          rounded-full border text-[9px] font-orbitron font-bold
          ${state === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : state === "current"
            ? "border-secondary bg-secondary text-secondary-foreground"
            : "border-muted-foreground/30 bg-background text-muted-foreground/50"
          }
        `}>
          {index + 1}
        </div>
      </div>

      <span className={`
        max-w-[5rem] text-center font-mono text-[9px] leading-tight
        ${state === "locked" ? "text-muted-foreground/30" : "text-muted-foreground"}
        ${state === "current" ? "text-secondary" : ""}
      `}>
        {room.title}
      </span>
    </motion.button>
  );
}
