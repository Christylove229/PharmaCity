import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Pill, 
  Trash2, 
  ArrowLeft, 
  Wallet, 
  AlertCircle, 
  ShoppingCart, 
  Truck, 
  Store,
  MapPin,
  User
} from "lucide-react";

const Cart = () => {
  const { cart, removeFromCart, totalAmount, appCommission, clearCart } = useCart();
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryInfo, setDeliveryInfo] = useState({
    adresse: "",
    destinataire: "",
    telephone: "",
    quartier: ""
  });
  const [clientGps, setClientGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const DELIVERY_FEE = 1000;
  const finalTotal = totalAmount + appCommission + (deliveryMode === 'delivery' ? DELIVERY_FEE : 0);

  const groupedItems = cart.reduce((acc, item) => {
    if (!acc[item.pharmacie_nom]) {
      acc[item.pharmacie_nom] = [];
    }
    acc[item.pharmacie_nom].push(item);
    return acc;
  }, {} as Record<string, typeof cart>);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShoppingCart className="h-20 w-20 text-slate-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Votre panier est vide</h2>
        <p className="text-slate-500 mt-2 mb-6">Ajoutez des médicaments pour commencer vos achats.</p>
        <Button onClick={() => navigate("/results")}>Parcourir les médicaments</Button>
      </div>
    );
  }

  const getClientLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setClientGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCheckout = async () => {
    // ✅ FIX 1 — Validation téléphone de livraison
    if (deliveryMode === 'delivery') {
      if (!deliveryInfo.adresse) {
        toast({ title: "Adresse manquante", description: "Veuillez saisir une adresse de livraison.", variant: "destructive" });
        return;
      }
      const phoneRegex = /^\+?[0-9\s]{8,15}$/;
      if (deliveryInfo.telephone && !phoneRegex.test(deliveryInfo.telephone)) {
        toast({ title: "Numéro invalide", description: "Vérifiez le numéro de téléphone du destinataire.", variant: "destructive" });
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    // ✅ FIX 2 — Code généré côté serveur via la fonction SQL generate_pickup_code()
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_pickup_code');

    if (codeError || !codeData) {
      toast({ title: "Erreur", description: "Impossible de générer le code de retrait. Réessayez.", variant: "destructive" });
      return;
    }

    const secureCode = codeData as string;

    const ordersToInsert = [];
    const groupedByPharmacie = cart.reduce((acc, item) => {
      if (!acc[item.pharmacie_id]) {
        acc[item.pharmacie_id] = 0;
      }
      acc[item.pharmacie_id] += (item.prix * item.quantite);
      return acc;
    }, {} as Record<string, number>);

    for (const [pharmacieId, totalBrut] of Object.entries(groupedByPharmacie)) {
      const pharmacyCommission = Math.floor(totalBrut * 0.01);
      const pharmacyNet = Math.floor(totalBrut * 0.99);
      
      ordersToInsert.push({
        user_id: session.user.id,
        pharmacie_id: pharmacieId,
        delivery_type: deliveryMode,
        delivery_address: deliveryMode === 'delivery' ? deliveryInfo.adresse : null,
        delivery_city: deliveryInfo.quartier || null,
        destinataire_nom: deliveryMode === 'delivery' ? deliveryInfo.destinataire : null,
        destinataire_telephone: deliveryMode === 'delivery' ? deliveryInfo.telephone : null,
        client_latitude: clientGps?.lat ?? null,
        client_longitude: clientGps?.lng ?? null,
        total_amount: totalBrut + (deliveryMode === 'delivery' ? DELIVERY_FEE : 0),
        app_commission: pharmacyCommission,
        pharmacy_net_amount: pharmacyNet,
        delivery_fee: deliveryMode === 'delivery' ? DELIVERY_FEE : 0,
        pickup_code: secureCode,  // ✅ Code sécurisé venant du serveur
        status: 'pending',
        delivery_status: deliveryMode === 'delivery' ? 'not_started' : null,
      });
    }

    const { data: insertedOrders, error } = await supabase.from('orders').insert(ordersToInsert).select();

    if (error) {
      // ✅ FIX 3 — Plus d'alert() avec message d'erreur brut
      toast({ title: "Erreur lors de la commande", description: "Une erreur est survenue. Veuillez réessayer.", variant: "destructive" });
      return;
    }

    if (insertedOrders) {
      const orderItemsToInsert = [];
      for (const order of insertedOrders) {
        const itemsForOrder = cart.filter(item => item.pharmacie_id === order.pharmacie_id);
        for (const item of itemsForOrder) {
          orderItemsToInsert.push({
            order_id: order.id,
            stock_id: item.stock_id,
            medicament_nom: item.medicament_nom,
            quantite: item.quantite,
            prix_unitaire: item.prix
          });
        }
      }
      await supabase.from('order_items').insert(orderItemsToInsert);
    }

    navigate(`/order-success?code=${secureCode}&mode=${deliveryMode}`);
    clearCart();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/results")} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la recherche
          </Button>
          <h1 className="text-3xl font-extrabold flex items-center">
            Mon Panier <Badge className="ml-3 bg-primary">{cart.length}</Badge>
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Mode de réception</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setDeliveryMode('pickup')}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                      deliveryMode === 'pickup' 
                      ? 'border-blue-600 bg-green-50 text-green-700' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <Store className="h-8 w-8 mb-2" />
                    <span className="font-bold">Retrait (Gratuit)</span>
                  </button>
                  <button 
                    onClick={() => setDeliveryMode('delivery')}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                      deliveryMode === 'delivery' 
                      ? 'border-blue-600 bg-green-50 text-green-700' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <Truck className="h-8 w-8 mb-2" />
                    <span className="font-bold">Livraison (+{DELIVERY_FEE}F)</span>
                  </button>
                </div>

                {deliveryMode === 'delivery' && (
                  <div className="mt-8 space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Destinataire (Qui reçoit ?)</Label>
                        <Input 
                          placeholder="Ex: Moi-même ou M. Dossou..." 
                          value={deliveryInfo.destinataire}
                          onChange={e => setDeliveryInfo({...deliveryInfo, destinataire: e.target.value})}
                          className="bg-white border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2" htmlFor="tel-destinataire">
                          Numéro de téléphone (À appeler)
                        </Label>
                        <Input 
                          id="tel-destinataire"
                          type="tel"
                          placeholder="Ex: +229 01020304" 
                          value={deliveryInfo.telephone}
                          onChange={e => setDeliveryInfo({...deliveryInfo, telephone: e.target.value})}
                          className="bg-white border-none shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Quartier</Label>
                      <Input 
                        placeholder="Ex: Akpakpa (Près du commissariat)" 
                        value={deliveryInfo.quartier}
                        onChange={e => setDeliveryInfo({...deliveryInfo, quartier: e.target.value})}
                        className="bg-white border-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Truck className="w-4 h-4" /> Adresse exacte / Points de repère</Label>
                      <Input 
                        placeholder="Ex: Maison bleue à côté de l'école..." 
                        value={deliveryInfo.adresse}
                        onChange={e => setDeliveryInfo({...deliveryInfo, adresse: e.target.value})}
                        className="bg-white border-none shadow-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={getClientLocation}
                      disabled={gpsLoading || !!clientGps}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                        clientGps
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-white border-dashed border-slate-300 text-slate-500 hover:border-green-400 hover:text-green-600'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                      {clientGps
                        ? `✅ Position GPS partagée (${clientGps.lat.toFixed(3)}, ${clientGps.lng.toFixed(3)})`
                        : gpsLoading
                        ? "Récupération de votre position..."
                        : "📍 Partager ma position GPS (optionnel, aide le livreur)"}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {Object.entries(groupedItems).map(([pharmacieNom, items]) => (
              <Card key={pharmacieNom} className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-slate-100/50 py-3">
                  <CardTitle className="text-sm font-bold flex items-center text-slate-600 uppercase tracking-tight">
                    <Pill className="h-4 w-4 mr-2" /> PROPOSÉ PAR : {pharmacieNom}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {items.map((item) => (
                    <div key={item.stock_id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{item.medicament_nom}</h4>
                        <p className="text-xs text-slate-500 uppercase font-mono">{item.prix} FCFA x {item.quantite}</p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className="font-black text-slate-900">{item.prix * item.quantite} FCFA</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFromCart(item.stock_id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-white sticky top-6">
              <CardHeader>
                <CardTitle className="text-xl">Résumé du paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-slate-500 text-sm">
                  <span>Sous-total médicaments</span>
                  <span className="font-medium text-slate-800">{totalAmount} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm">
                  <span>Frais de service (1%)</span>
                  <span className="font-medium text-green-600">+{appCommission} FCFA</span>
                </div>
                {deliveryMode === 'delivery' && (
                  <div className="flex justify-between text-slate-500 text-sm">
                    <span>Frais de livraison</span>
                    <span className="font-medium text-orange-600">+{DELIVERY_FEE} FCFA</span>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold">Total à régler</span>
                  <span className="text-2xl font-black text-primary">{finalTotal} FCFA</span>
                </div>
                
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 mt-4 space-y-2">
                  <div className="flex items-center text-green-700 font-bold text-[10px] uppercase">
                    <AlertCircle className="h-3 w-3 mr-1" /> Sécurité Paiement
                  </div>
                  <p className="text-[10px] text-green-600 leading-relaxed italic">
                    Votre argent est sécurisé par PharmaCity et reversé après réception du médicament.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button onClick={handleCheckout} className="w-full py-8 text-lg font-black shadow-lg shadow-primary/20 bg-green-600">
                  <Wallet className="mr-2 h-5 w-5" />
                  CONFIRMER LE PAIEMENT
                </Button>
                <div className="flex justify-center items-center space-x-2 opacity-30 grayscale scale-75">
                  <div className="h-4 w-12 bg-slate-900 rounded"></div>
                  <div className="h-4 w-12 bg-slate-900 rounded"></div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;