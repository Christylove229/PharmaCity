import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Trash2, ArrowLeft, Wallet, AlertCircle, ShoppingCart } from "lucide-react";

const Cart = () => {
  const { cart, removeFromCart, totalAmount, appCommission, pharmaciesParts } = useCart();
  const navigate = useNavigate();

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
    // Dans la réalité, on lance FedaPay ici. Une fois le paiement OK, on redirige :
    const randomCode = Math.floor(Math.random() * 900000 + 100000);
    navigate(`/order-success?code=${randomCode}`);
    clearCart();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
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
            {Object.entries(groupedItems).map(([pharmacieNom, items]) => (
              <Card key={pharmacieNom} className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-slate-100/50 py-3">
                  <CardTitle className="text-sm font-bold flex items-center text-slate-600">
                    <Pill className="h-4 w-4 mr-2" /> PROPOSÉ PAR : {pharmacieNom.toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {items.map((item) => (
                    <div key={item.stock_id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{item.medicament_nom}</h4>
                        <p className="text-sm text-slate-500">{item.prix} FCFA x {item.quantite}</p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className="font-bold text-slate-900">{item.prix * item.quantite} FCFA</span>
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
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span className="font-medium text-slate-800">{totalAmount} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Frais de service (1%)</span>
                  <span className="font-medium text-blue-600">+{appCommission} FCFA</span>
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-xl font-black">Total à payer</span>
                  <span className="text-2xl font-black text-primary">{totalAmount + appCommission} FCFA</span>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 space-y-2">
                   <div className="flex items-center text-blue-700 font-bold text-xs uppercase">
                      <AlertCircle className="h-3 w-3 mr-1" /> Sécurité Paiement
                   </div>
                   <p className="text-[10px] text-blue-600 leading-relaxed">
                      L'argent est sécurisé par Medoc et reversé aux pharmacies uniquement après validation de votre commande.
                   </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button onClick={handleCheckout} className="w-full py-7 text-lg shadow-lg shadow-primary/20">
                  <Wallet className="mr-2 h-5 w-5" />
                  Payer via Mobile Money
                </Button>
                <div className="flex justify-center items-center space-x-2 grayscale opacity-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Paiements acceptés :</span>
                  <div className="h-4 w-8 bg-slate-300 rounded"></div>
                  <div className="h-4 w-8 bg-slate-300 rounded"></div>
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
