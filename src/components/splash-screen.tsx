import { Pill } from "lucide-react";

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="flex flex-col items-center">
        {/* Container du logo avec animation de "battement de coeur" (pulse) */}
        <div className="bg-primary text-white p-6 rounded-3xl shadow-2xl animate-bounce">
          <Pill className="h-16 w-16" />
        </div>
        
        {/* Nom de l'application avec fondu progressif */}
        <h1 className="mt-6 text-4xl font-extrabold text-foreground tracking-tight animate-pulse">
          PharmaCity
        </h1>
        
        {/* Petit texte ou indicateur de chargement */}
        <div className="mt-8 flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-[bounce_1s_infinite_0ms]"></div>
          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]"></div>
          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-[bounce_1s_infinite_400ms]"></div>
        </div>
      </div>
    </div>
  );
};
