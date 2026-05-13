import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h2 className="font-orbitron text-2xl font-bold text-destructive mb-4">
            КРИТИЧЕСКАЯ ОШИБКА
          </h2>
          <p className="font-mono text-sm text-muted-foreground mb-6 max-w-md">
            Произошел сбой при загрузке сценария. Данные повреждены или недоступны.
          </p>
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 mb-8 text-left overflow-auto max-w-lg w-full">
            <code className="font-mono text-xs text-destructive">
              {this.state.error?.message || "Unknown error"}
            </code>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="font-orbitron uppercase"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Перезагрузить систему
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
