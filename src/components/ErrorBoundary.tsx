import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
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
    // В будущем здесь можно добавить отправку логов в Sentry или Supabase
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleClearAndReload = () => {
    if (confirm("Это удалит ваши временные данные (прогресс текущей сессии). Продолжить?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="relative">
              <AlertTriangle className="h-20 w-20 text-destructive mx-auto animate-pulse" />
              <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full -z-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-orbitron text-2xl font-bold text-destructive tracking-tighter">
                КРИТИЧЕСКАЯ ОШИБКА
              </h2>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                System failure detected
              </p>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-left overflow-auto max-h-40">
              <code className="font-mono text-[10px] text-destructive whitespace-pre-wrap">
                {this.state.error?.stack || this.state.error?.message || "Unknown system error"}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()}
                className="font-orbitron uppercase bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Перезагрузить систему
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={this.handleReset}
                  className="flex-1 font-orbitron text-[10px] uppercase border-border/50"
                >
                  Попробовать снова
                </Button>
                <Button 
                  variant="ghost"
                  onClick={this.handleClearAndReload}
                  className="flex-1 font-orbitron text-[10px] uppercase text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Очистить кеш
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
