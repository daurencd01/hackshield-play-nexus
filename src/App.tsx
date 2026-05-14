import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import HomePage from "./pages/Index";
import MissionsPage from "./pages/Missions";
import MissionPlayPage from "./pages/MissionPlay";
import ArenaPage from "./pages/Arena";
import Game2DPage from "./pages/Game2D";
import ProfilePage from "./pages/Profile";
import AchievementsPage from "./pages/Achievements";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/Onboarding";
import SettingsPage from "./pages/Settings";
import ChatPage from "./pages/Chat";


import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { InstallPrompt } from '@/components/InstallPrompt';

const queryClient = new QueryClient();

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
            path="/2d-game" 
            element={
              <ProtectedRoute>
                <Game2DPage />
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
          <Route 
            path="/chat/:chatId" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <PWAUpdatePrompt />
      <InstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
