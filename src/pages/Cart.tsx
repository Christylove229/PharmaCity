import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    quartier: ""
  });
  const navigate = useNavigate();

  const DELIVERY_FEE = 1000; // Forfait livraison
  const finalTotal = totalAmount + appCommission + (deliveryMode === 'delivery' ? DELIVERY_FEE : 0);

  // Grouper les articles par pharmacie pour la clarté
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

  const handleCheckout = () => {
    if (deliveryMode === 'delivery' && !deliveryInfo.adresse) {
      alert("Veuillez saisir une adresse de livraison !");
      return;
    }
    // Simulation de paiement
    const randomCode = Math.floor(Math.random() * 900000 + 100000);
    navigate(`/order-success?code=${randomCode}`);
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
            {/* Mode de réception */}
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
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
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
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
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
                        <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Nom du destinataire</Label>
                        <Input 
                          placeholder="Ex: Mme Dossou (Pour un proche)" 
                          value={deliveryInfo.destinataire}
                          onChange={e => setDeliveryInfo({...deliveryInfo, destinataire: e.target.value})}
                          className="bg-white border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Quartier</Label>
                        <Input 
                          placeholder="Ex: Akpakpa" 
                          value={deliveryInfo.quartier}
                          onChange={e => setDeliveryInfo({...deliveryInfo, quartier: e.target.value})}
                          className="bg-white border-none shadow-sm"
                        />
                      </div>
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
                  <span className="font-medium text-blue-600">+{appCommission} FCFA</span>
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
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 space-y-2">
                   <div className="flex items-center text-blue-700 font-bold text-[10px] uppercase">
                      <AlertCircle className="h-3 w-3 mr-1" /> Sécurité Paiement
                   </div>
                   <p className="text-[10px] text-blue-600 leading-relaxed italic">
                      Votre argent est sécurisé par Medoc et reversé après réception du médicament.
                   </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button onClick={handleCheckout} className="w-full py-8 text-lg font-black shadow-lg shadow-primary/20 bg-blue-600">
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
