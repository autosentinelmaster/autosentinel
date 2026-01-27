import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CreateToken from "./pages/CreateToken";
import AddVehicle from "./pages/AddVehicle";
import Messages from "./pages/Messages";
import HowItWorks from "./pages/HowItWorks";
import AISummaries from "./pages/AISummaries";
import PastUsers from "./pages/PastUsers";
import Child from "./pages/Child";
import TestCar from "./pages/TestCar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-token" element={<CreateToken />} />
              <Route path="/add-vehicle" element={<AddVehicle />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/ai-summaries" element={<AISummaries />} />
              <Route path="/past-users" element={<PastUsers />} />
              <Route path="/child" element={<Child />} />
              <Route path="/test-car" element={<TestCar />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;