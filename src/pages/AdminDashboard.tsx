import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, TrendingUp, ShoppingCart, Briefcase, Clock, CheckCircle2, 
  ShieldAlert, ArrowRight, Loader2, Bike, CheckCircle, XCircle, 
  DollarSign, Activity, Plus as PlusIcon, Phone, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommissions: 0,
    activePharmacies: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data for the new dedicated pages
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [medicaments, setMedicaments] = useState<any[]>([]);

  const ADMIN_EMAIL = "christylovedovonon1@gmail.com"; 

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && session.user.email === ADMIN_EMAIL) {
      setIsAdminAuthenticated(true);
      loadAllData();
    } else {
      setIsAdminAuthenticated(false);
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadAdminStats(),
      loadPharmacies(),
      loadLivreurs(),
      loadMedicaments()
    ]);
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail !== ADMIN_EMAIL && adminEmail !== "christylove229@gmail.com") {
       toast({ title: "Accès refusé", description: "Cet email n'a pas les droits administrateur.", variant: "destructive" });
       return;
    }
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) throw error;
      
      toast({ title: "Bienvenue Administrateur 👑", description: "Accès autorisé." });
      setIsAdminAuthenticated(true);
      loadAllData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
       toast({ title: "Erreur", description: "Veuillez entrer votre email.", variant: "destructive" });
       return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(adminEmail);
      if (error) throw error;
      toast({ title: "Email envoyé 📩", description: "Vérifiez votre boîte mail pour réinitialiser le mot de passe." });
      setIsResetMode(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  // --- DATA LOADING --- //
  const loadAdminStats = async () => {
    try {
      const { count: pharmacyCount } = await supabase.from('pharmacies').select('*', { count: 'exact', head: true });
      const { data: ordersData } = await supabase.from('orders').select('total_amount, app_commission, status');

      const totalSales = ordersData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
      const totalCommissions = ordersData?.reduce((acc, curr) => acc + Number(curr.app_commission), 0) || 0;
      const pendingOrders = ordersData?.filter(o => o.status === 'pending_payout').length || 0;

      setStats({
        totalSales,
        totalCommissions,
        activePharmacies: pharmacyCount || 0,
        pendingOrders
      });

      const { data: recent } = await supabase
        .from('orders')
        .select(`id, total_amount, app_commission, created_at, status, pharmacie_id`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recent && recent.length > 0) {
        const pharmacyIds = Array.from(new Set(recent.map(r => r.pharmacie_id).filter(id => !!id)));
        let pharmMap = new Map();
        if (pharmacyIds.length > 0) {
          const { data: pharmData } = await supabase.from('pharmacies').select('id, nom').in('id', pharmacyIds);
          pharmMap = new Map(pharmData?.map(p => [p.id, p.nom]));
        }
        setRecentOrders(recent.map(r => ({
          id: r.id.substring(0, 8),
          pharmacy: pharmMap.get(r.pharmacie_id) || 'Inconnue',
          amount: r.total_amount,
          commission: r.app_commission,
          date: new Date(r.created_at).toLocaleDateString(),
          status: r.status
        })));
      }
    } catch (error) {
      console.error("Erreur stats admin:", error);
    }
  };

  const loadPharmacies = async () => {
    const { data } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
    if (data) setPharmacies(data);
  };

  const loadLivreurs = async () => {
    const { data } = await supabase.from('livreurs').select('*').order('created_at', { ascending: false });
    if (data) setLivreurs(data);
  };

  const loadMedicaments = async () => {
    const { data } = await supabase.from('medicaments').select('*').order('nom', { ascending: true });
    if (data) setMedicaments(data);
  };

  // --- ACTIONS --- //
  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nom = formData.get('nom') as string;
    
    const { error } = await supabase.from('medicaments').insert([{ nom }]);
    if (error) {
      toast({ title: "Erreur", description: "Le médicament existe déjà.", variant: "destructive" });
    } else {
      toast({ title: "Succès ! ✅", description: `${nom} ajouté au catalogue.` });
      (e.target as HTMLFormElement).reset();
      loadMedicaments();
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce médicament du catalogue global ?")) return;
    const { error } = await supabase.from('medicaments').delete().eq('id', id);
    if (!error) {
       toast({ title: "Supprimé", description: "Le médicament a été retiré." });
       loadMedicaments();
    }
  };

  const updateLivreurStatus = async (id: string, newStatus: 'active' | 'suspended' | 'pending') => {
    const { error } = await supabase.from('livreurs').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    } else {
      toast({ title: "Mis à jour ! ✅", description: `Le statut du livreur a été modifié.` });
      loadLivreurs();
    }
  };


  // --- RENDERING --- //
  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-red-600" /></div>;

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        
        <button onClick={() => navigate("/")} className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 font-bold text-sm">
          ← Retour au site
        </button>

        <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-red-100 overflow-hidden">
          <CardHeader className="text-center bg-red-600 text-white rounded-t-xl py-8">
            <div className="bg-red-500/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner shadow-black/20 border-2 border-red-400">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-widest">Zone Administrateur</CardTitle>
            <CardDescription className="text-red-100 font-medium mt-2">
              Accès ultra-sécurisé PharmaCity 👑
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-8 bg-white">
            {isResetMode ? (
               <form onSubmit={handleAdminReset} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="space-y-2">
                   <Label className="text-red-700 font-bold">Email de récupération</Label>
                   <Input 
                      type="email" required disabled={authLoading} value={adminEmail} 
                      onChange={e => setAdminEmail(e.target.value)} 
                      placeholder="christylovedovonon1@gmail.com" 
                      className="focus-visible:ring-red-500 border-red-200 h-12" 
                   />
                 </div>
                 <Button type="submit" disabled={authLoading} className="w-full bg-red-600 hover:bg-red-700 text-white py-6 font-bold text-md shadow-lg shadow-red-500/20">
                   {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Recevoir un lien de réinitialisation"}
                 </Button>
                 <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-center text-sm text-slate-500 hover:text-red-600 font-bold transition-colors">
                   ← Revenir à la connexion
                 </button>
               </form>
            ) : (
               <form onSubmit={handleAdminLogin} className="space-y-6 animate-in fade-in slide-in-from-left-4">
                 <div className="space-y-2">
                   <Label className="text-red-700 font-bold">L'email du BIG BOSS</Label>
                   <Input 
                      type="email" required disabled={authLoading} value={adminEmail} 
                      onChange={e => setAdminEmail(e.target.value)} placeholder="votre@email.com" 
                      className="focus-visible:ring-red-500 border-red-200 h-12" 
                   />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-red-700 font-bold">Mot de passe secret</Label>
                   <Input 
                      type="password" required disabled={authLoading} value={adminPassword} 
                      onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" 
                      className="focus-visible:ring-red-500 border-red-200 h-12" 
                   />
                 </div>
                 <Button type="submit" disabled={authLoading} className="w-full bg-red-600 hover:bg-red-700 text-white py-6 font-bold text-lg shadow-lg shadow-red-500/20">
                   {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authentification Requise"}
                 </Button>
                 <button type="button" onClick={() => setIsResetMode(true)} className="w-full text-center text-sm text-red-600 font-bold hover:underline">
                   Oups, mot de passe oublié ?
                 </button>
               </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-8">
           <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                 SUPER-ADMIN PHARMACITY 👑
              </h1>
              <p className="text-slate-400 mt-2">Gérez vos officines, vos livreurs et suivez les flux financiers (1%).</p>
           </div>
           <div className="flex gap-4">
              <Button variant="outline" className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" onClick={async () => {
                 await supabase.auth.signOut();
                 navigate("/");
              }}>
                 Déconnexion Sécurisée
              </Button>
           </div>
        </div>

        {/* Le système d'onglets pour faire "Page dans la Page" */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-1 md:grid-cols-4 w-full h-auto gap-2 bg-transparent p-0 mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white py-4 rounded-xl font-bold bg-slate-900 border border-slate-800">
              📊 Vue Générale
            </TabsTrigger>
            <TabsTrigger value="pharmacies" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-4 rounded-xl font-bold bg-slate-900 border border-slate-800">
              <Briefcase className="w-4 h-4 mr-2" /> Officines
            </TabsTrigger>
            <TabsTrigger value="livreurs" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white py-4 rounded-xl font-bold bg-slate-900 border border-slate-800">
              <Bike className="w-4 h-4 mr-2" />Livreurs
            </TabsTrigger>
            <TabsTrigger value="medicaments" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white py-4 rounded-xl font-bold bg-slate-900 border border-slate-800">
              <Activity className="w-4 h-4 mr-2" />Catalogue Médicaments
            </TabsTrigger>
          </TabsList>

          {/* ================= PAGE VUE GÉNÉRALE ================= */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
                  <CardContent className="pt-6">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vos Commissions (1%)</p>
                           <h3 className="text-3xl font-black mt-1 text-emerald-400">{stats.totalCommissions} FCFA</h3>
                        </div>
                        <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                           <TrendingUp className="h-5 w-5" />
                        </div>
                     </div>
                  </CardContent>
               </Card>

               <Card className="bg-slate-900/50 border-slate-800 shadow-xl group">
                  <CardContent className="pt-6">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Volume Ventes Global</p>
                           <h3 className="text-3xl font-black mt-1">{stats.totalSales} FCFA</h3>
                        </div>
                        <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                           <ShoppingCart className="h-5 w-5" />
                        </div>
                     </div>
                  </CardContent>
               </Card>

               <Card className="bg-slate-900/50 border-slate-800 shadow-xl group">
                  <CardContent className="pt-6">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pharmacies Actives</p>
                           <h3 className="text-3xl font-black mt-1">{stats.activePharmacies}</h3>
                        </div>
                        <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                           <Briefcase className="h-5 w-5" />
                        </div>
                     </div>
                  </CardContent>
               </Card>

               <Card className="bg-slate-900/50 border-slate-800 shadow-xl group">
                  <CardContent className="pt-6">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Commandes en cours</p>
                           <h3 className="text-3xl font-black mt-1">{stats.pendingOrders}</h3>
                        </div>
                        <div className="h-10 w-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
                           <Clock className="h-5 w-5" />
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
               <CardHeader>
                  <CardTitle className="flex items-center text-xl text-white">
                     <Activity className="h-5 w-5 mr-3 text-red-500" /> Flux des 5 dernières Transactions
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] font-bold">
                           <tr>
                              <th className="px-6 py-4">ID</th>
                              <th className="px-6 py-4">Pharmacie</th>
                              <th className="px-6 py-4 text-right">Commission (1%)</th>
                              <th className="px-6 py-4">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                           {recentOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                 <td className="px-6 py-4">
                                    <span className="block font-bold text-white">{order.id}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{order.date}</span>
                                 </td>
                                 <td className="px-6 py-4 text-slate-400">{order.pharmacy}</td>
                                 <td className="px-6 py-4 text-right">
                                    <span className="text-emerald-400 font-bold">+{order.commission} FCFA</span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <Badge variant="outline" className={`border-none ${
                                      order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-400'
                                    }`}>
                                       {order.status === 'completed' ? 'Validé' : 'En attente'}
                                    </Badge>
                                 </td>
                              </tr>
                           ))}
                           {recentOrders.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-slate-500">Aucune transaction pour le moment.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          {/* ================= PAGE PHARMACIES ================= */}
          <TabsContent value="pharmacies" className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Pharmacies Partenaires</h2>
              <Badge className="bg-purple-500/20 text-purple-400">{pharmacies.length} Inscriptions</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {pharmacies.map(p => (
                  <Card key={p.id} className="bg-slate-900 border-slate-800 hover:border-purple-500 overflow-hidden transition-colors">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div className="bg-purple-500/10 p-3 rounded-lg">
                              <Briefcase className="w-6 h-6 text-purple-400" />
                           </div>
                           <Badge className="bg-emerald-500/10 text-emerald-500 border-none">Active</Badge>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-2">{p.nom}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /> {p.ville || 'Bénin'}</p>
                        <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> {p.telephone || 'Non renseigné'}</p>
                        <div className="mt-6 pt-4 border-t border-slate-800 text-sm">
                           <p className="text-slate-500 font-mono">FedaPay Retrait : {p.payout_number || 'Non configuré'}</p>
                        </div>
                     </CardContent>
                  </Card>
               ))}
               {pharmacies.length === 0 && <p className="col-span-3 text-center text-slate-500 py-12">Aucune pharmacie enregistrée pour l'instant.</p>}
            </div>
          </TabsContent>

          {/* ================= PAGE LIVREURS ================= */}
          <TabsContent value="livreurs" className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Flotte de Livreurs</h2>
                <Badge className="bg-orange-500/20 text-orange-400">{livreurs.length} Inscrits</Badge>
             </div>
             
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                         <th className="px-6 py-4">Nom du Livreur</th>
                         <th className="px-6 py-4">Contact & Ville</th>
                         <th className="px-6 py-4">Véhicule</th>
                         <th className="px-6 py-4">Statut</th>
                         <th className="px-6 py-4 text-right">Actions de Modération</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                      {livreurs.map((l) => (
                         <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-white">{l.nom}</td>
                            <td className="px-6 py-4 text-slate-400">
                               <div>{l.telephone}</div>
                               <div className="text-xs">{l.ville}</div>
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 font-mono">
                                 {l.vehicule_type} - {l.plaque_immatriculation}
                               </Badge>
                            </td>
                            <td className="px-6 py-4">
                               <Badge className={`border-none ${
                                 l.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                                 l.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 
                                 'bg-orange-500/10 text-orange-500'
                               }`}>
                                 {l.status === 'active' ? 'Activé' : l.status === 'suspended' ? 'Suspendu' : 'En attente'}
                               </Badge>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                               {l.status !== 'active' && (
                                 <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white" onClick={() => updateLivreurStatus(l.id, 'active')}>
                                   <CheckCircle className="w-4 h-4 mr-2" /> Valider
                                 </Button>
                               )}
                               {l.status !== 'suspended' && (
                                 <Button size="sm" variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => updateLivreurStatus(l.id, 'suspended')}>
                                   <XCircle className="w-4 h-4 mr-2" /> Bloquer
                                 </Button>
                               )}
                            </td>
                         </tr>
                      ))}
                      {livreurs.length === 0 && (
                         <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucun livreur n'est inscrit dans le système.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </TabsContent>

          {/* ================= PAGE MÉDICAMENTS (GLOBAL) ================= */}
          <TabsContent value="medicaments" className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Base de données Médicaments</h2>
                  <p className="text-slate-400 text-sm mt-1">Les patients pourront rechercher uniquement ces médicaments.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulaire GAUCHE */}
                <div className="lg:col-span-1">
                   <Card className="bg-sky-950/30 border-sky-900/50">
                      <CardHeader>
                         <CardTitle className="text-sky-400 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Ajouter un nom</CardTitle>
                      </CardHeader>
                      <CardContent>
                         <form onSubmit={handleAddMedication} className="space-y-4">
                            <div className="space-y-2">
                               <Label className="text-slate-300">Nom commercial ou molécule</Label>
                               <Input name="nom" placeholder="Ex: Paracétamol 500mg" className="bg-slate-900 border-slate-800 text-white focus-visible:ring-sky-500" required />
                            </div>
                            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20">Archiver dans la base</Button>
                         </form>
                      </CardContent>
                   </Card>
                </div>

                {/* Liste DROITE */}
                <div className="lg:col-span-2">
                   <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 max-h-[60vh] overflow-y-auto">
                      <h3 className="font-bold text-slate-300 mb-4 flex items-center justify-between">
                         Catalogue Global
                         <Badge variant="outline" className="border-slate-700 text-slate-400">{medicaments.length} entrées</Badge>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {medicaments.map(m => (
                            <div key={m.id} className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                               <span className="font-medium text-slate-200">{m.nom}</span>
                               <button 
                                  onClick={() => handleDeleteMedication(m.id)}
                                  className="text-slate-500 hover:text-red-500 transition-colors p-1"
                                  title="Supprimer"
                               >
                                  <XCircle className="w-4 h-4" />
                               </button>
                            </div>
                         ))}
                         {medicaments.length === 0 && <p className="col-span-2 text-center text-slate-500 py-8">La base de données est vide.</p>}
                      </div>
                   </div>
                </div>
             </div>
          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
};

export default AdminDashboard;
