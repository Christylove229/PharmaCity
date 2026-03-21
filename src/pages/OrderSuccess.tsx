import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MapPin, Printer, Share2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || "CMD-"+Math.floor(Math.random()*9000+1000);
  const pickupCode = searchParams.get('code') || Math.floor(Math.random()*900000+100000).toString();
  const mode = searchParams.get('mode') || 'pickup';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle2 className="h-16 w-16 text-green-600 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Paiement Réussi !</h1>
          <p className="text-slate-500">Votre commande est prête à être récupérée.</p>
        </div>

        <Card className="border-2 border-dashed border-primary/20 shadow-2xl bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6 border-b border-dashed">
             <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Code de Retrait Universel</p>
             <div className="bg-white px-6 py-4 rounded-xl border-2 border-primary shadow-sm inline-block">
                <span className="text-4xl font-black tracking-[0.3em] text-slate-900">#{pickupCode}</span>
             </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-6 text-left">
            <div className="flex justify-between items-start border-b pb-4">
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Numéro de Commande</p>
                  <p className="font-bold text-slate-800">{orderId}</p>
               </div>
               <Badge className="bg-green-500">PAYÉ ✅</Badge>
            </div>

            <div className="space-y-3">
               <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-primary mr-2 mt-1" />
                  <div>
                     <p className="text-sm font-bold text-slate-800">
                        {mode === 'delivery' ? "DONNEZ CE CODE AU LIVREUR À SON ARRIVÉE" : "PRÉSENTEZ CE CODE À LA PHARMACIE"}
                     </p>
                     <p className="text-xs text-slate-500 leading-relaxed">
                        {mode === 'delivery' 
                          ? "Le livreur vous demandera ce code avant de vous remettre le colis. C'est votre clé de sécurité." 
                          : "Le pharmacien validera ce code pour vous remettre vos médicaments."}
                     </p>
                  </div>
               </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
               <p className="text-[10px] text-orange-700 leading-relaxed italic">
                  * Ne partagez jamais ce code. Il est la preuve unique de votre achat.
               </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
           <Button variant="outline" className="py-6" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimer
           </Button>
           <Button variant="outline" className="py-6">
              <Share2 className="h-4 w-4 mr-2" /> Partager
           </Button>
        </div>

        <Button className="w-full py-7 text-lg shadow-xl" onClick={() => navigate("/")}>
           Retour à l'accueil <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default OrderSuccess;
