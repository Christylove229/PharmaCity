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

interface Purchase {
  id: string;
  pharmacie_name: string;
  medicament_name: string;
  prix_total: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const History = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchases = async () => {
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
          .from('purchases' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPurchases(data || []);
      } catch (error) {
        console.error("Erreur de récupération de l'historique:", error);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer vos achats.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
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
        ) : purchases.length === 0 ? (
          <Card className="text-center py-16 bg-muted/30">
            <CardContent>
              <Pill className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Aucun achat récent</h2>
              <p className="text-muted-foreground mb-6">Vous n'avez pas encore effectué d'achat ou de réservation.</p>
              <Link to="/">
                <Button>
                  Rechercher un médicament
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <Pill className="h-4 w-4 mr-2 text-blue-500" />
                      {purchase.medicament_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {purchase.pharmacie_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {purchase.prix_total} FCFA
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm border-t pt-3 mt-1">
                    <div className="text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </div>
                    <div className="flex items-center text-green-600 font-medium">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirmé
                    </div>
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
