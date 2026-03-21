import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Vérifier si on n'est pas déjà en mode standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-8">
      <div className="bg-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/20 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Installer l'appli PharmaCity</p>
            <p className="text-xs text-green-100">Plus rapide et accessible partout</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            className="bg-white text-green-600 hover:bg-white/90 font-bold"
            onClick={handleInstallClick}
          >
            Installer
          </Button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
