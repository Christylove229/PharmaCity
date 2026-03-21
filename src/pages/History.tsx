import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, MapPin, Pill, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  delivery_type: string;
  pickup_code: string;
  pharmacies?: { nom: string };
}

const History = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Connexion requise",
            description: "Vous devez être connecté pour voir votre historique.",
            variant: "destructive"
          });
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select('*, pharmacies(nom)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error("Erreur de récupération de l'historique:", error);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer vos commandes.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-14 sm:pt-28 sm:pb-16 container mx-auto px-4 sm:px-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
            <Clock className="mr-3 h-6 w-6 text-primary" />
            Mon Historique d'Achats
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-16 bg-muted/30">
            <CardContent>
              <Pill className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Aucune commande récente</h2>
              <p className="text-muted-foreground mb-6">Vous n'avez pas encore effectué d'achat sur PharmaCity.</p>
              <Link to="/results">
                <Button>
                  Rechercher un médicament
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow border-green-100">
                <CardHeader className="pb-3 border-b border-slate-50 relative bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                     <Badge variant="outline" className={`border-none ${order.delivery_type === 'delivery' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.delivery_type === 'delivery' ? 'LIVRAISON' : 'RETRAIT PHARMACIE'}
                     </Badge>
                     <span className="text-xs font-mono text-slate-400">CMD-{order.id.substring(0, 6).toUpperCase()}</span>
                  </div>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-green-600" />
                    {order.pharmacies?.nom || "Pharmacie PharmaCity"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-sm font-bold text-slate-600">Montant payé</span>
                    <span className="font-bold text-green-700">{order.total_amount} FCFA</span>
                  </div>
                  
                  <div className="text-center p-4 bg-sky-50 rounded-xl border border-sky-100">
                     <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider mb-1">
                        Ton Code Universel 🔑
                     </p>
                     <p className="font-mono text-3xl font-black text-slate-900 tracking-[0.2em]">{order.pickup_code}</p>
                     <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                        {order.delivery_type === 'delivery' 
                           ? "Ceci est ta clé de sécurité. Remets ce code uniquement à ton LIVREUR quand il est devant toi." 
                           : "Montre ce code au PHARMACIEN pour récupérer ton sachet médical."}
                     </p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                    <div>
                      {new Date(order.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", hour: "2-digit", minute:"2-digit"
                      })}
                    </div>
                    {order.status === 'completed' ? (
                       <span className="flex items-center text-green-600 font-bold"><CheckCircle2 className="w-3 h-3 mr-1"/> Terminée</span>
                    ) : (
                       <span className="flex items-center text-orange-500 font-bold"><Clock className="w-3 h-3 mr-1"/> En cours</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default History;
