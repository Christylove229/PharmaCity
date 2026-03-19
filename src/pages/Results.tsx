import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Clock, ArrowLeft, Filter, Loader2, MessageCircle, ShoppingCart, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/utils/logger";
import { useCart } from "@/context/CartContext";

interface SearchResult {
  stock_id: string; // Ajouté pour le panier
  medicament_nom: string;
  medicament_id: string;
  pharmacie_nom: string;
  pharmacie_id: string;
  pharmacie_adresse: string;
  pharmacie_latitude: number;
  pharmacie_longitude: number;
  pharmacie_horaires: string;
  pharmacie_telephone: string;
  quantite: number;
  disponible: boolean;
  prix?: number;
}

interface NearbyPharmacy {
  pharmacie_id: string;
  pharmacie_nom: string;
  pharmacie_adresse: string;
  pharmacie_latitude: number;
  pharmacie_longitude: number;
  pharmacie_horaires: string;
  pharmacie_telephone: string;
  distance_km: number;
}

const Results = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"pharmacie" | "distance" | "nom_medicament" | "disponibilite">("pharmacie");
  const [isNearbySearch, setIsNearbySearch] = useState(false);
  const [locationSource, setLocationSource] = useState<string>("");
  const { toast } = useToast();
  
  // Utilisation du panier
  const { addToCart, cart } = useCart();

  const openWhatsApp = (phoneNumber: string, pharmacyName: string, medicationName: string) => {
    if (!phoneNumber || !phoneNumber.trim()) {
      toast({ title: "Numéro invalide", description: "Ce numéro n'est pas disponible", variant: "destructive" });
      return;
    }
    let digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.substring(2);
    if (digits.startsWith('229')) digits = digits.substring(3);
    if (digits.startsWith('0')) digits = digits.substring(1);
    const internationalDigits = `229${digits}`;
    const message = `Bonjour ${pharmacyName},\n\nJe vous contacte via Medoc pour le médicament « ${medicationName} ». Est-il disponible ?`;
    window.open(`https://wa.me/${internationalDigits}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchResults = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_medicament', { search_term: term });
      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      logError('Erreur recherche:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyPharmacies = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_nearby_pharmacies', { user_lat: lat, user_lon: lng, max_distance: 10 });
      if (error) throw error;
      setNearbyPharmacies(data || []);
    } catch (error) {
      logError('Erreur pharmacies proches:', error);
      setNearbyPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setAuthLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (authLoading) return;
    const q = searchParams.get('q');
    const nearby = searchParams.get('nearby');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (nearby === 'true' && lat && lng) {
      setIsNearbySearch(true);
      setSortBy("distance");
      fetchNearbyPharmacies(parseFloat(lat), parseFloat(lng));
    } else if (q) {
      setIsNearbySearch(false);
      setSearchTerm(q);
      fetchResults(q);
    } else setLoading(false);
  }, [searchParams, authLoading]);

  const handleAddToCart = (result: SearchResult) => {
    addToCart({
      stock_id: result.stock_id || `${result.pharmacie_id}-${result.medicament_id}`,
      medicament_nom: result.medicament_nom,
      pharmacie_id: result.pharmacie_id,
      pharmacie_nom: result.pharmacie_nom,
      prix: result.prix || 0,
      quantite: 1
    });
    toast({
      title: "Ajouté au panier 🛒",
      description: `${result.medicament_nom} est maintenant dans votre panier.`,
    });
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "pharmacie") return a.pharmacie_nom.localeCompare(b.pharmacie_nom);
    if (sortBy === "nom_medicament") return a.medicament_nom.localeCompare(b.medicament_nom);
    return 0;
  });

  if (authLoading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      {/* Badge Panier Flottant */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={() => navigate("/cart")}
            className="h-16 w-16 rounded-full shadow-2xl bg-primary hover:bg-primary/95 flex flex-col items-center justify-center p-0"
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="text-[10px] font-bold mt-1">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
            <Badge className="absolute -top-1 -right-1 bg-red-500 border-2 border-white">{cart.length}</Badge>
          </Button>
        </div>
      )}

      <main className="pt-28 pb-20 container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
            <h1 className="text-2xl font-black text-slate-900">
               {isNearbySearch ? "Pharmacies aux alentours" : `Résultats pour "${searchTerm}"`}
            </h1>
          </div>

          {!isNearbySearch && (
             <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border">
                <div className="flex-1">
                   <SearchInput 
                     placeholder="Rechercher un autre médicament..." 
                     value={searchTerm} 
                     onSearch={(v) => { setSearchTerm(v); fetchResults(v); }}
                   />
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-full md:w-60"><SelectValue placeholder="Trier par..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmacie">Nom Pharmacie</SelectItem>
                    <SelectItem value="nom_medicament">Médicament</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          )}

          {loading ? (
             <div className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>
          ) : (
            <div className="grid gap-6">
              {sortedResults.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                   <p className="text-slate-400">Aucun résultat trouvé.</p>
                </div>
              ) : (
                sortedResults.map((result, i) => (
                  <Card key={i} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white">
                    <CardHeader className="pb-2">
                       <div className="flex justify-between items-start">
                          <div>
                            <Badge className="mb-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">💊 {result.medicament_nom}</Badge>
                            <CardTitle className="text-xl font-bold">{result.pharmacie_nom}</CardTitle>
                            <p className="text-sm text-slate-500 flex items-center mt-1"><MapPin className="h-3 w-3 mr-1" /> {result.pharmacie_adresse}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-primary">{result.prix || 0} FCFA</p>
                             <p className="text-[10px] text-slate-400 uppercase font-bold">Prix unitaire</p>
                          </div>
                       </div>
                    </CardHeader>
                    <CardContent>
                       <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t">
                          <div className="flex gap-4 text-xs font-medium text-slate-500">
                             <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {result.pharmacie_horaires || "N/A"}</span>
                             <span className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {result.pharmacie_telephone || "N/A"}</span>
                             <Badge variant={result.disponible ? "default" : "destructive"} className="text-[10px]">
                                {result.disponible ? "EN STOCK" : "RUPTURE"}
                             </Badge>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                             <Button 
                               onClick={() => handleAddToCart(result)}
                               disabled={!result.disponible} 
                               className="flex-1 md:flex-none bg-primary shadow-lg shadow-primary/20"
                             >
                                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter au panier
                             </Button>
                             <Button 
                               variant="outline"
                               onClick={() => openWhatsApp(result.pharmacie_telephone, result.pharmacie_nom, result.medicament_nom)}
                               className="border-green-200 text-green-600 hover:bg-green-50"
                             >
                                <MessageCircle className="h-4 w-4" />
                             </Button>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Results;