import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  Loader2, 
  Pill, 
  Search, 
  ChevronRight, 
  X, 
  Package, 
  CreditCard, 
  History, 
  CheckCircle2,
  Clock 
} from "lucide-react";
import { logError } from "@/utils/logger";

interface Order {
  id: string;
  created_at: string;
  medicament_nom: string;
  quantite: number;
  prix_total: number;
  client_email: string;
  status: 'pending_pickup' | 'completed' | 'cancelled';
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [medicaments, setMedicaments] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]); // Simulation commandes
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNewMedicamentForm, setShowNewMedicamentForm] = useState(false);
  
  const [pharmacyForm, setPharmacyForm] = useState({
    nom: "",
    adresse: "",
    horaires: "",
    telephone: "",
    payout_number: "", // Nouveau: Numéro de retrait auto
  });
  
  const [newStock, setNewStock] = useState({
    medicament_id: "",
    quantite: "",
    prix: "",
    disponible: true,
  });

  const [newMedicament, setNewMedicament] = useState({
    nom: "",
    forme: "",
    dosage: "",
    description: ""
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth/pharmacy");
      } else {
        setUser(session.user);
        loadPharmacyData(session.user.id);
        loadMedicaments();
        loadOrders(); // Simuler chargement commandes
      }
    });
  }, [navigate]);

  const loadOrders = () => {
    // Simulation de commandes reçues pour démo
    const mockOrders: Order[] = [
      {
        id: "CMD-8821",
        created_at: new Date().toISOString(),
        medicament_nom: "Paracétamol 500mg",
        quantite: 2,
        prix_total: 1000,
        client_email: "client@exemple.com",
        status: 'pending_pickup'
      },
      {
        id: "CMD-8819",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        medicament_nom: "Amoxicilline",
        quantite: 1,
        prix_total: 2500,
        client_email: "jean.dupont@test.com",
        status: 'completed'
      }
    ];
    setOrders(mockOrders);
  };

  const loadPharmacyData = async (userId: string) => {
    try {
      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (pharmacyError) throw pharmacyError;

      if (pharmacyData) {
        setPharmacy(pharmacyData);
        setPharmacyForm({
          nom: pharmacyData.nom || "",
          adresse: pharmacyData.adresse || "",
          horaires: pharmacyData.horaires || "",
          telephone: pharmacyData.telephone || "",
          payout_number: pharmacyData.payout_number || "",
        });
        loadStocks(pharmacyData.id);
      }
    } catch (error) {
      logError('Error loading pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStocks = async (pharmacyId: string) => {
    try {
      const { data, error } = await supabase
        .from("stocks_view")
        .select("*")
        .eq("pharmacie_id", pharmacyId);

      if (error) throw error;
      setStocks(data || []);
    } catch (error) {
      logError('Error loading stocks:', error);
    }
  };

  const loadMedicaments = async () => {
    try {
      const { data, error } = await supabase.from("medicaments").select("*").order("nom");
      if (error) throw error;
      setMedicaments(data || []);
    } catch (error) {
      logError('Error loading medicaments:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/pharmacy");
  };

  const savePharmacyInfo = async () => {
    if (!user) return;
    try {
      if (pharmacy) {
        const { error } = await supabase.from("pharmacies").update(pharmacyForm).eq("id", pharmacy.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("pharmacies").insert({ ...pharmacyForm, user_id: user.id }).select().single();
        if (error) throw error;
        setPharmacy(data);
      }
      toast({ title: "Informations sauvegardées ✅" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const addStock = async () => {
    if (!pharmacy || !newStock.medicament_id || !newStock.quantite || !newStock.prix) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("stocks").insert([{
        pharmacie_id: pharmacy.id,
        medicament_id: newStock.medicament_id,
        quantite: parseInt(newStock.quantite),
        prix: parseFloat(newStock.prix) || 0,
        disponible: newStock.disponible,
      }]);

      if (error) throw error;
      toast({ title: "Stock mis à jour ✅" });
      loadStocks(pharmacy.id);
      setNewStock({ medicament_id: "", quantite: "", prix: "", disponible: true });
      setShowAddForm(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const deleteStock = async (stockId: string) => {
    try {
      const { error } = await supabase.from("stocks").delete().eq("id", stockId);
      if (error) throw error;
      toast({ title: "Médicament retiré du stock" });
      loadStocks(pharmacy.id);
    } catch (error: any) {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const addNewMedicament = async () => {
    if (!newMedicament.nom.trim()) return;
    try {
      const { data, error } = await supabase.from("medicaments").insert({
        nom: newMedicament.nom.trim(),
        forme: newMedicament.forme.trim() || null,
        dosage: newMedicament.dosage.trim() || null,
      }).select().single();
      if (error) throw error;
      await loadMedicaments();
      setNewStock({ ...newStock, medicament_id: data.id });
      setShowNewMedicamentForm(false);
      setNewMedicament({ nom: '', forme: '', dosage: '', description: '' });
      toast({ title: "Médicament ajouté à la base de données" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const topMedicaments = [...stocks].sort((a,b) => b.quantite - a.quantite).slice(0, 5).map(s => ({ nom: s.medicament_nom }));

  const filteredStocks = stocks.filter(s => 
    s.medicament_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <Pill className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Medoc <span className="text-primary">PRO</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-500 hidden md:block">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-500 hover:text-red-500">
            <LogOut className="h-4 w-4 mr-2" /> Quitter
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-xl w-full md:w-auto h-auto grid grid-cols-3">
            <TabsTrigger value="orders" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
               <CreditCard className="h-4 w-4 mr-2" /> Commandes
            </TabsTrigger>
            <TabsTrigger value="stock" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
               <Package className="h-4 w-4 mr-2" /> Mon Stock
            </TabsTrigger>
            <TabsTrigger value="profile" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
               <History className="h-4 w-4 mr-2" /> Ma Pharmacie
            </TabsTrigger>
          </TabsList>

          {/* ONGLET COMMANDES */}
          <TabsContent value="orders" className="space-y-4">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-600 text-white border-none shadow-lg">
                   <CardContent className="pt-6">
                      <p className="text-green-100 text-xs font-bold uppercase">Solde Total Disponible</p>
                      <h3 className="text-3xl font-black mt-1">
                         {orders.reduce((acc, o) => acc + (o.status === 'completed' ? o.prix_total * 0.99 : 0), 0)} FCFA
                      </h3>
                      <p className="text-[10px] text-green-100 mt-2 italic">Calculé après votre commission de 99%</p>
                   </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-none">
                   <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                         <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Ventes du jour</p>
                            <h3 className="text-2xl font-black mt-1 text-slate-800">{orders.length}</h3>
                         </div>
                         <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <ShoppingCart className="h-5 w-5" />
                         </div>
                      </div>
                   </CardContent>
                </Card>
             </div>

             <Card className="border-none shadow-sm">
                <CardHeader>
                   <CardTitle>Dernières Commandes</CardTitle>
                   <CardDescription>Validez les médicaments quand le client arrive.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                               <th className="px-6 py-4">ID / Date</th>
                               <th className="px-6 py-4">Client</th>
                               <th className="px-6 py-4">Médicament</th>
                               <th className="px-6 py-4 text-right">Votre Part (99%)</th>
                               <th className="px-6 py-4">Status</th>
                               <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y">
                            {orders.map((order) => (
                               <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-medium">
                                     <span className="block text-slate-900">{order.id}</span>
                                     <span className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString()}</span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{order.client_email}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">{order.medicament_nom} x{order.quantite}</td>
                                  <td className="px-6 py-4 text-right font-black text-green-600">
                                     {(order.prix_total * 0.99).toFixed(0)} FCFA
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex flex-col gap-1">
                                        {order.status === 'pending_pickup' ? (
                                           <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 pointer-events-none">
                                              À retirer
                                           </Badge>
                                        ) : (
                                           <Badge className="bg-green-100 text-green-600 hover:bg-green-100 pointer-events-none">
                                              Terminé
                                           </Badge>
                                        )}
                                        <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-500 font-bold">
                                           ⚡ Virement Automatique OK
                                        </Badge>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     {order.status === 'pending_pickup' && (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                           <Input placeholder="Code Client" className="h-8 text-[10px] text-center font-bold" />
                                           <Button size="sm" className="h-7 text-[10px]" onClick={() => {
                                              toast({ title: "Médicament livré ✅", description: "Le code est valide." });
                                              loadOrders();
                                           }}>Valider</Button>
                                        </div>
                                     )}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </CardContent>
             </Card>
          </TabsContent>

          {/* ONGLET STOCK */}
          <TabsContent value="stock" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
               <div className="md:col-span-1">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Ajouter un produit</CardTitle>
                      <Button variant="outline" size="icon" onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </CardHeader>
                    {showAddForm && (
                      <CardContent className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                           <div className="flex justify-between items-center text-xs">
                              <Label>Médicament</Label>
                              <button onClick={() => setShowNewMedicamentForm(!showNewMedicamentForm)} className="text-primary hover:underline font-bold">
                                 + Nouveau
                              </button>
                           </div>
                           {showNewMedicamentForm ? (
                              <div className="bg-slate-50 p-3 rounded-lg border border-primary/20 space-y-3">
                                 <Input placeholder="Nom du médicament" value={newMedicament.nom} onChange={e => setNewMedicament({...newMedicament, nom: e.target.value})} className="h-8 text-sm" />
                                 <Input placeholder="Forme (ex: Sirop)" value={newMedicament.forme} onChange={e => setNewMedicament({...newMedicament, forme: e.target.value})} className="h-8 text-sm" />
                                 <Button size="sm" className="w-full h-8" onClick={addNewMedicament}>Créer</Button>
                              </div>
                           ) : (
                              <select className="w-full h-10 border rounded-lg px-2 text-sm bg-white" value={newStock.medicament_id} onChange={e => setNewStock({...newStock, medicament_id: e.target.value})}>
                                 <option value="">-- Sélectionner --</option>
                                 {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} {m.dosage}</option>)}
                              </select>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <Label className="text-xs">Quantité</Label>
                              <Input type="number" value={newStock.quantite} onChange={e => setNewStock({...newStock, quantite: e.target.value})} placeholder="0" />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-xs">Prix (FCFA)</Label>
                              <Input type="number" value={newStock.prix} onChange={e => setNewStock({...newStock, prix: e.target.value})} placeholder="500" />
                           </div>
                        </div>
                        <Button onClick={addStock} className="w-full py-6">Mettre en vente</Button>
                      </CardContent>
                    )}
                  </Card>
               </div>

               <div className="md:col-span-2 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Rechercher dans mon stock..." className="pl-10 h-12 bg-white border-none shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                     {filteredStocks.map((stock) => (
                        <Card key={stock.stock_id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                           <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <h4 className="font-bold text-slate-800 text-lg leading-none">{stock.medicament_nom}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{stock.medicament_forme || "Format standard"}</p>
                                 </div>
                                 <Button variant="ghost" size="icon" onClick={() => deleteStock(stock.stock_id)} className="text-slate-300 hover:text-red-500 h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                              <div className="grid grid-cols-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Quantité</p>
                                    <p className="text-xl font-black text-slate-700">{stock.quantite}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Prix Vente</p>
                                    <p className="text-xl font-black text-primary">{stock.prix} FCFA</p>
                                 </div>
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>
               </div>
            </div>
          </TabsContent>

          {/* ONGLET MA PHARMACIE */}
          <TabsContent value="profile">
            <div className="grid md:grid-cols-3 gap-8">
               <Card className="md:col-span-2 border-none shadow-sm">
                  <CardHeader><CardTitle>Informations de l'officine</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Nom affiché aux clients</Label>
                        <Input value={pharmacyForm.nom} onChange={e => setPharmacyForm({...pharmacyForm, nom: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <Label>Adresse physique</Label>
                        <Input value={pharmacyForm.adresse} onChange={e => setPharmacyForm({...pharmacyForm, adresse: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Téléphone Pharmacie</Label>
                           <Input value={pharmacyForm.telephone} onChange={e => setPharmacyForm({...pharmacyForm, telephone: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-primary font-bold">Numéro MTN/Moov de RETRAIT</Label>
                           <Input placeholder="Ex: 229XXXXXXXX" value={pharmacyForm.payout_number} onChange={e => setPharmacyForm({...pharmacyForm, payout_number: e.target.value})} className="border-primary bg-primary/5" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label>Horaires</Label>
                        <Input value={pharmacyForm.horaires} onChange={e => setPharmacyForm({...pharmacyForm, horaires: e.target.value})} />
                     </div>
                     <Button onClick={savePharmacyInfo} className="w-full py-6"><Save className="h-4 w-4 mr-2" /> Mettre à jour mon profil</Button>
                  </CardContent>
               </Card>
               <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-primary text-white">
                     <CardHeader><CardTitle className="text-sm uppercase font-bold opacity-80">Rapport Financier</CardTitle></CardHeader>
                     <CardContent>
                        <h3 className="text-3xl font-black">100% Connecté</h3>
                        <p className="text-xs mt-2 opacity-80">Votre pharmacie est visible par des milliers de clients potentiels.</p>
                     </CardContent>
                  </Card>
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;