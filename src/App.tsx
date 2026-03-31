import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "./pages/Index";
import MissionsPage from "./pages/Missions";
import MissionPlayPage from "./pages/MissionPlay";
import ArenaPage from "./pages/Arena";
import ProfilePage from "./pages/Profile";
import AchievementsPage from "./pages/Achievements";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/Onboarding";
import SettingsPage from "./pages/Settings";

const queryClient = new QueryClient();

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f18]">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/missions" 
            element={
              <ProtectedRoute>
                <MissionsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/mission/:id" 
            element={
              <ProtectedRoute>
                <MissionPlayPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/arena" 
            element={
              <ProtectedRoute>
                <ArenaPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
