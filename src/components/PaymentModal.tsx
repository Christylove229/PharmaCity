import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  pharmacyName: string;
  medicationName: string;
  price?: number;
}

export function PaymentModal({ pharmacyName, medicationName, price }: PaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // Prix par défaut de simulation si non spécifié (ex. en FCFA)
  const displayPrice = price ? price : 1500; 

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulation d'une requête de paiement vers une API (ex: FedaPay, KkiaPay, Stripe)
    setTimeout(async () => {
      setLoading(false);
      setSuccess(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Enregistrer l'achat dans Supabase
          await supabase.from('purchases' as any).insert({
            user_id: user.id,
            pharmacie_name: pharmacyName,
            medicament_name: medicationName,
            prix_total: displayPrice,
            status: 'completed',
            payment_method: 'digital'
          });

          // 1. Déduction locale (Stock de Medoc sur Supabase) 
          // Note : on pourrait d'abord vérifier dans pharmacy_api_configs si on DOIT déduire localement.
          // Mais dans tous les cas, on déduit en local pour l'affichage de l'appli.
          await supabase.rpc('decrease_stock', {
            p_pharmacie_name: pharmacyName,
            p_medicament_name: medicationName,
            p_quantite_achetee: 1
          });

          // 2. PRÉPARATION API EXTERNE : Synchronisation avec le logiciel de la pharmacie (WinPharma, etc.)
          // Lorsque vous aurez les API des différentes pharmacies, vous ne ferez pas l'appel directement d'ici 
          // (pour ne pas exposer leurs clés secrètes aux clients web/mobile).
          // L'approche sera :
          //   A. Vérifier si cette pharmacie a un "webhook_url" et "is_active = true" dans "pharmacy_api_configs"
          //   B. Si oui, appeler une "Edge Function" (Fonction Backend Supabase) qui passera la commande à l'API externe (donc on ne supprime PAS en parallèle localement si vous gérez le point de vérité uniquement côté pharmacie externe. Sinon, vous faites les deux comme suggéré ci-dessus).
          
          /* Exemple du code final à décommenter plus tard :
             
             // Check config
             const { data: apiConfig } = await supabase.from('pharmacy_api_configs')
                .select('*')
                .eq('pharmacie_id', pharmacyId) // Note: Il faudra ajouter pharmacyId aux props de PaymentModal
                .single();
                
             if (apiConfig && apiConfig.is_active) {
                // Option A : Géré par le logiciel (Pas de modification directe du stock local)
                await supabase.functions.invoke('sync-external-pharmacy-stock', {
                  body: { 
                    pharmacy_name: pharmacyName, 
                    medication_name: medicationName, 
                    qty_sold: 1 
                  }
                });
             } else {
                // Option B : Géré uniquement par Medoc
                await supabase.rpc('decrease_stock', {
                  p_pharmacie_name: pharmacyName,
                  p_medicament_name: medicationName,
                  p_quantite_achetee: 1
                });
             }
          */
        }
      } catch (error) {
        console.error("Erreur lors de la mémorisation de l'achat ou maj stock:", error);
      }

      toast({
        title: "Paiement réussi ✅",
        description: `Votre commande pour ${medicationName} a été confirmée auprès de ${pharmacyName}.`,
      });

      // Fermer le modal après 2 secondes
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false); // reset state
      }, 2000);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-md">
          <CreditCard className="h-4 w-4 mr-2" />
          Acheter / Réserver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement sécurisé</DialogTitle>
          <DialogDescription>
            {medicationName} chez {pharmacyName}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in" />
            <h3 className="text-lg font-medium">Paiement validé</h3>
            <p className="text-sm text-muted-foreground">Votre commande est prête à être retirée à la pharmacie.</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg mb-6 flex justify-between items-center">
              <span className="font-medium text-sm">Total à payer</span>
              <span className="text-xl font-bold">{displayPrice} FCFA</span>
            </div>

            <Tabs defaultValue="momo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="momo" className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Money
                </TabsTrigger>
                <TabsTrigger value="card" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Carte Bancaire
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="momo">
                <form onSubmit={handlePayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Numéro de téléphone (MTN, Moov)</Label>
                    <Input id="phone" placeholder="ex: 01 97 00 00 00" required />
                  </div>
                  <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Traitement..." : `Payer ${displayPrice} FCFA`}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="card">
                <form onSubmit={handlePayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Nom sur la carte</Label>
                    <Input id="cardName" placeholder="Jean Dupont" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Numéro de carte</Label>
                    <Input id="cardNumber" placeholder="0000 0000 0000 0000" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiration</Label>
                      <Input id="expiry" placeholder="MM/AA" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" placeholder="123" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Traitement..." : `Payer ${displayPrice} FCFA`}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
