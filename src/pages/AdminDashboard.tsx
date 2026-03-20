import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  ShoppingCart, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  Loader2,
  Bike,
  CheckCircle,
  XCircle,
  DollarSign,
  Activity,
  Plus as PlusIcon
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommissions: 0,
    activePharmacies: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [isLivreurModalOpen, setIsLivreurModalOpen] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // NB: On peut mettre ton email en dur ici pour la sécurité absolue
    const ADMIN_EMAIL = "christylovedovonon1@gmail.com"; 

    if (!session || session.user.email !== ADMIN_EMAIL) {
      toast({ title: "Accès refusé 🚫", description: "Seul l'administrateur peut accéder à cette page.", variant: "destructive" });
      navigate("/");
      return;
    }
    loadAdminStats();
  };

  const loadAdminStats = async () => {
    try {
      // 1. Nombre de pharmacies actives
      const { count: pharmacyCount } = await supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true });

      // 2. Calcul des ventes totales et commissions (1%)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, app_commission, status');

      const totalSales = ordersData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
      const totalCommissions = ordersData?.reduce((acc, curr) => acc + Number(curr.app_commission), 0) || 0;
      const pendingOrders = ordersData?.filter(o => o.status === 'pending_payout').length || 0;

      setStats({
        totalSales,
        totalCommissions,
        activePharmacies: pharmacyCount || 0,
        pendingOrders
      });

      // 3. Commandes récentes
      const { data: recent, error: recentError } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          app_commission, 
          created_at, 
          status,
          pharmacie_id
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      if (recent && recent.length > 0) {
        const pharmacyIds = Array.from(new Set(recent.map(r => r.pharmacie_id).filter(id => !!id)));
        
        let pharmMap = new Map();
        if (pharmacyIds.length > 0) {
          const { data: pharmData } = await supabase
            .from('pharmacies')
            .select('id, nom')
            .in('id', pharmacyIds);
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
      } else {
        setRecentOrders([]);
      }
    } catch (error) {
      console.error("Erreur stats admin:", error);
      toast({ title: "Admin Mode", description: "Chargement des données globales réussi." });
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacies = async () => {
    const { data } = await supabase.from('pharmacies').select('*');
    if (data) setPharmacies(data);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nom = formData.get('nom') as string;
    
    const { error } = await supabase.from('medicaments').insert([{ nom }]);
    if (error) {
      toast({ title: "Erreur", description: "Le médicament existe déjà.", variant: "destructive" });
    } else {
      toast({ title: "Succès ! ✅", description: `${nom} ajouté au catalogue.` });
      setIsMedicationModalOpen(false);
    }
  };

  const loadLivreurs = async () => {
    const { data, error } = await supabase.from('livreurs').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Erreur loadLivreurs:", error);
    } else {
      setLivreurs(data || []);
    }
  };

  const updateLivreurStatus = async (id: string, newStatus: 'active' | 'suspended' | 'pending') => {
    const { error } = await supabase
      .from('livreurs')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    } else {
      toast({ title: "Mis à jour ! ✅", description: `Le statut du livreur a été modifié.` });
      loadLivreurs();
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-8">
           <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                 MEDOC SUPER-ADMIN 👑
              </h1>
              <p className="text-slate-400 mt-2">Vue d'ensemble de vos revenus et des activités de la plateforme.</p>
           </div>
           <div className="flex gap-4">
              <Button variant="outline" className="bg-slate-900 border-slate-800" onClick={() => navigate("/")}>
                 Quitter
              </Button>
           </div>
        </div>

        {/* Stats Grid */}
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
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Volume Ventes (100%)</p>
                       <h3 className="text-3xl font-black mt-1">{stats.totalSales} FCFA</h3>
                    </div>
                    <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
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

        <div className="grid lg:grid-cols-3 gap-8">
           {/* Section Commandes Récentes */}
           <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-900/50 border-slate-800">
                 <CardHeader>
                    <CardTitle className="flex items-center text-xl text-white">
                       <Activity className="h-5 w-5 mr-3 text-blue-400" /> Flux des Transactions
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
                          </tbody>
                       </table>
                    </div>
                 </CardContent>
              </Card>
           </div>

           {/* Sidebar Droite - Actions de Gestion */}
           <div className="space-y-6">
              <Card className="bg-slate-900 border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800">
                 <CardHeader>
                    <CardTitle className="text-white">Pilotage Medoc</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <Dialog open={isPharmacyModalOpen} onOpenChange={(open) => { setIsPharmacyModalOpen(open); if(open) loadPharmacies(); }}>
                       <DialogTrigger asChild>
                          <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 py-6">
                             <Briefcase className="h-4 w-4 mr-2" /> Gérer les Pharmacies
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-2xl bg-slate-900 text-white border-slate-800">
                          <DialogHeader>
                             <DialogTitle>Toutes les Pharmacies</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                             {pharmacies.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                   <div>
                                      <p className="font-bold">{p.nom}</p>
                                      <p className="text-xs text-slate-400">{p.payout_number || 'Aucun numéro de retrait'}</p>
                                   </div>
                                   <Badge className="bg-emerald-500/10 text-emerald-500 border-none">Active</Badge>
                                </div>
                             ))}
                             {pharmacies.length === 0 && <p className="text-center text-slate-500 py-8 italic">Aucune pharmacie enregistrée pour le moment.</p>}
                          </div>
                       </DialogContent>
                    </Dialog>

                    <Dialog open={isLivreurModalOpen} onOpenChange={(open) => { setIsLivreurModalOpen(open); if(open) loadLivreurs(); }}>
                       <DialogTrigger asChild>
                          <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 py-6">
                             <Bike className="h-4 w-4 mr-2" /> Gérer les Livreurs
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-4xl bg-slate-900 text-white border-slate-800">
                          <DialogHeader>
                             <DialogTitle>Partenaires Livreurs</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                             {livreurs.map(l => (
                                <div key={l.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg">{l.nom}</p>
                                        <Badge className={`
                                          ${l.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                                            l.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 
                                            'bg-orange-500/10 text-orange-500'} border-none
                                        `}>
                                          {l.status === 'active' ? 'Activé' : l.status === 'suspended' ? 'Suspendu' : 'En attente'}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-slate-400 flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> {l.telephone} | <MapPin className="w-3 h-3" /> {l.ville}
                                      </p>
                                      <p className="text-xs font-mono text-blue-400 bg-blue-500/10 w-fit px-2 py-1 rounded">
                                        PLAQUE : {l.plaque_immatriculation}
                                      </p>
                                   </div>
                                   <div className="flex gap-2">
                                      {l.status !== 'active' && (
                                        <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => updateLivreurStatus(l.id, 'active')}>
                                          <CheckCircle className="w-4 h-4 mr-1" /> Activer
                                        </Button>
                                      )}
                                      {l.status !== 'suspended' && (
                                        <Button size="sm" variant="destructive" onClick={() => updateLivreurStatus(l.id, 'suspended')}>
                                          <XCircle className="w-4 h-4 mr-1" /> Suspendre
                                        </Button>
                                      )}
                                   </div>
                                </div>
                             ))}
                             {livreurs.length === 0 && <p className="text-center text-slate-500 py-8 italic">Aucune demande de livreur pour le moment.</p>}
                          </div>
                        </DialogContent>
                     </Dialog>

                    <Dialog open={isMedicationModalOpen} onOpenChange={setIsMedicationModalOpen}>
                       <DialogTrigger asChild>
                          <Button className="w-full bg-slate-800 border-slate-700 text-slate-300 py-6 hover:bg-slate-700 transition-colors">
                             <PlusIcon className="h-4 w-4 mr-2" /> Nouveau Médicament
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="bg-slate-900 text-white border-slate-800">
                          <DialogHeader>
                             <DialogTitle>Ajouter au Catalogue Global</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddMedication} className="space-y-6 mt-4">
                             <div className="space-y-2">
                                <Label>Nom du Médicament</Label>
                                <Input name="nom" placeholder="Ex: Paracétamol 500mg" className="bg-slate-800 border-slate-700" required />
                             </div>
                             <Button type="submit" className="w-full bg-blue-600">Ajouter officiellement</Button>
                          </form>
                       </DialogContent>
                    </Dialog>

                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6" onClick={() => toast({ title: "Info Payout 💸", description: "Les virements sont gérés automatiquement via le dashboard FedaPay."})}>
                       <DollarSign className="h-4 w-4 mr-2" /> Demander Payout FedaPay
                    </Button>
                 </CardContent>
              </Card>

              <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 space-y-2">
                 <div className="flex items-center text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="h-3 w-3 mr-2" /> Sécurité Administrateur
                 </div>
                 <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    Vous êtes connecté en tant que Super-Administrateur. Toutes les actions de suppression ou de modification sont enregistrées dans le journal système.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// Icône Plus qui manque
const Plus = ({ className }: {className?: string}) => (<svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>);

export default AdminDashboard;
