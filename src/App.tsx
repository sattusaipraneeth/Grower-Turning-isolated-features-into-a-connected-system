import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Goals from "./pages/Goals";
import Growth from "./pages/Growth";
import Todos from "./pages/Todos";
import Notes from "./pages/Notes";
import Focus from "./pages/Focus";
import CalendarPage from "./pages/Calendar";
import Files from "./pages/Files";
import WeeklyReview from "./pages/WeeklyReview";
import NotFound from "./pages/NotFound";
import { DensityProvider } from "./hooks/useDensity";
import { ThemeProvider } from "./hooks/useTheme";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <DensityProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/habits" element={<Habits />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/growth" element={<Growth />} />
                  <Route path="/todos" element={<Todos />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/focus" element={<Focus />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/files" element={<Files />} />
                  <Route path="/weekly" element={<WeeklyReview />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DensityProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
