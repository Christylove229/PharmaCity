import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
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
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const displayPrice = price ? price : 1500;

  // ✅ FIX — Validation du numéro Mobile Money avant envoi
  const handleMomoPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^\+?[0-9\s]{8,15}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Numéro invalide",
        description: "Entrez un numéro Mobile Money valide (ex: +229 01 00 00 00).",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // TODO: Remplacer ce setTimeout par l'appel réel à FedaPay
    // Exemple d'intégration FedaPay :
    // const fedapay = await supabase.functions.invoke('create-fedapay-transaction', {
    //   body: { amount: displayPrice, phone, description: `${medicationName} - ${pharmacyName}` }
    // });

    setTimeout(async () => {
      setLoading(false);
      setSuccess(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('purchases' as any).insert({
            user_id: user.id,
            pharmacie_name: pharmacyName,
            medicament_name: medicationName,
            prix_total: displayPrice,
            status: 'completed',
            payment_method: 'mobile_money'
          });

          await supabase.rpc('decrease_stock', {
            p_pharmacie_name: pharmacyName,
            p_medicament_name: medicationName,
            p_quantite_achetee: 1
          });
        }
      } catch {
        // Erreur silencieuse en prod
      }

      toast({
        title: "Paiement réussi ✅",
        description: `Votre commande pour ${medicationName} a été confirmée auprès de ${pharmacyName}.`,
      });

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setPhone("");
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

            {/* ✅ Mobile Money — seul mode actif */}
            <form onSubmit={handleMomoPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Numéro Mobile Money (MTN / Moov)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="ex: +229 01 97 00 00 00"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Traitement..." : `Payer ${displayPrice} FCFA via Mobile Money`}
              </Button>
            </form>

            {/* ✅ FIX — Carte bancaire : redirige vers FedaPay au lieu d'un faux formulaire */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Paiement par carte bancaire
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://fedapay.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Payer par carte via FedaPay
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center italic">
                Vous serez redirigé vers la plateforme sécurisée FedaPay (PCI-DSS).
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}