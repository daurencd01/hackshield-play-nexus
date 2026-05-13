import { motion } from "framer-motion";

interface ConnectorProps {
  fromCompleted: boolean;
  reversed: boolean;
}

export function MapLine({ fromCompleted, reversed }: ConnectorProps) {
  return (
    <div className="flex flex-1 items-center px-1">
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ transformOrigin: reversed ? "right" : "left" }}
        className={`
          h-0.5 w-full rounded-full transition-colors duration-700
          ${fromCompleted ? "bg-primary shadow-sm shadow-primary/40" : "bg-muted-foreground/20"}
        `}
      />
    </div>
  );
}
