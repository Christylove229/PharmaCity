import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Index from "./pages/Index";
import Results from "./pages/Results";
import Auth from "./pages/Auth";
import AuthPharmacy from "./pages/AuthPharmacy";
import Dashboard from "./pages/Dashboard";
import Validation from "./pages/Validation";
import DevTest from "./pages/DevTest";
import Mission from "./pages/Mission";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import ChangePassword from "./pages/ChangePassword";
import Cart from "./pages/Cart";
import OrderSuccess from "./pages/OrderSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import AuthLivreur from "./pages/AuthLivreur";
import LivreurDashboard from "./pages/LivreurDashboard"; // Nouveau
import { SplashScreen } from "@/components/splash-screen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          
          {showSplash && <SplashScreen />}
          
          <div className={`transition-opacity duration-700 ${showSplash ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 min-h-screen'}`}>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/results" element={<Results />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/admin-medoc" element={<AdminDashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/pharmacy" element={<AuthPharmacy />} />
                <Route path="/auth/livreur" element={<AuthLivreur />} />
                <Route path="/auth/change-password" element={<ChangePassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/livreur" element={<LivreurDashboard />} />
                <Route path="/validation" element={<Validation />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/dev-test" element={<DevTest />} />
                <Route path="/history" element={<History />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
};

export default App;
