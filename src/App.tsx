import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { InstallPrompt } from '@/components/InstallPrompt';
import { lazy, Suspense } from 'react';

// Lazy load pages
const HomePage = lazy(() => import("./pages/Index"));
const MissionsPage = lazy(() => import("./pages/Missions"));
const MissionPlayPage = lazy(() => import("./pages/MissionPlay"));
const ArenaPage = lazy(() => import("./pages/Arena"));
const Game2DPage = lazy(() => import("./pages/Game2D"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const UserProfilePage = lazy(() => import("./pages/UserProfile"));
const AchievementsPage = lazy(() => import("./pages/Achievements"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ChatPage = lazy(() => import("./pages/Chat"));

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
    <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
  </div>
);


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
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
              path="/profile/:idOrUsername" 
              element={
                <ProtectedRoute>
                  <UserProfilePage />
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
        </Suspense>
      </BrowserRouter>
      <PWAUpdatePrompt />
      <InstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);


export default App;
