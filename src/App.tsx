import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WeatherProvider } from "./contexts/WeatherContext";
import Landing from "./pages/Landing";
import Viewer from "./pages/Viewer";
import WeatherEditorPage from "./pages/WeatherEditorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WeatherProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/viewer" element={<Viewer />} />
            <Route path="/editor" element={<WeatherEditorPage />} />
            <Route path="/editor/:mapId" element={<WeatherEditorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WeatherProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
