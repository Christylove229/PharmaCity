import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bike, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Package, 
  Navigation,
  AlertTriangle,
  LogOut,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const LivreurDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [livreur, setLivreur] = useState<any>(null);
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [myCurrentDelivery, setMyCurrentDelivery] = useState<any>(null);
    const [pickupCode, setPickupCode] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        loadLivreurData();
    }, []);

    const loadLivreurData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth/livreur");
            return;
        }

        const { data: livreurData, error } = await supabase
            .from('livreurs')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error || !livreurData) {
            navigate("/");
            return;
        }

        setLivreur(livreurData);
        
        if (livreurData.status === 'active') {
            loadAvailableOrders(livreurData.ville);
            loadMyActiveDelivery(livreurData.id);
        }
        setLoading(false);
    };

    const loadAvailableOrders = async (ville: string) => {
        const { data } = await supabase
            .from('orders')
            .select('*, pharmacies(nom, ville)')
            .eq('delivery_type', 'delivery')
            .eq('delivery_status', 'not_started')
            // Optionnel: filtrer par ville ici si on veut être strict
            .order('created_at', { ascending: false });
        
        setAvailableOrders(data || []);
    };

    const loadMyActiveDelivery = async (livreurId: string) => {
        const { data } = await supabase
            .from('orders')
            .select('*, pharmacies(nom, telephone, ville)')
            .eq('livreur_id', livreurId)
            .in('delivery_status', ['finding_driver', 'on_the_way'])
            .single();
        
        setMyCurrentDelivery(data);
    };

    const takeOrder = async (orderId: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ 
                livreur_id: livreur.id, 
                delivery_status: 'finding_driver' 
            })
            .eq('id', orderId);

        if (error) {
            toast({ title: "Erreur", description: "Impossible de prendre cette course.", variant: "destructive" });
        } else {
            toast({ title: "Course acceptée ! 🛵", description: "Allez chercher le colis à la pharmacie." });
            loadLivreurData();
        }
    };

    const confirmPickup = async () => {
        const { error } = await supabase
            .from('orders')
            .update({ delivery_status: 'on_the_way' })
            .eq('id', myCurrentDelivery.id);
        
        if (!error) {
            toast({ title: "En chemin !", description: "Livrez le colis au client." });
            loadLivreurData();
        }
    };

    const confirmDelivery = async () => {
        // Dans une V2, on vérifierait le code ici. Pour l'instant, on fait la logique de base.
        if (pickupCode.length < 4) {
             toast({ title: "Code requis", description: "Demandez le code au client.", variant: "destructive" });
             return;
        }

        const { error } = await supabase
            .from('orders')
            .update({ 
                delivery_status: 'delivered',
                status: 'completed'
            })
            .eq('id', myCurrentDelivery.id);
        
        if (!error) {
            toast({ title: "Livré ! 🎊", description: "Course terminée. Votre gain a été crédité." });
            setMyCurrentDelivery(null);
            setPickupCode("");
            loadLivreurData();
        }
    };

    if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (livreur.status === 'pending') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
                <h2 className="text-2xl font-bold">Compte en attente de validation</h2>
                <p className="text-slate-500 mt-2 max-w-md">L'administrateur Medoc vérifie vos documents. Vous recevrez une notification dès que vous pourrez commencer à livrer.</p>
                <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>Retour à l'accueil</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Profile */}
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <Bike className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{livreur.nom}</h2>
                            <p className="text-xs text-slate-500 font-mono uppercase">Plaque : {livreur.plaque_immatriculation}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
                        <LogOut className="w-5 h-5 text-slate-400" />
                    </Button>
                </div>

                {/* Active Delivery Section */}
                {myCurrentDelivery ? (
                    <Card className="border-2 border-blue-500 shadow-xl overflow-hidden animate-pulse-subtle">
                        <CardHeader className="bg-blue-600 text-white">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" /> Course en cours
                                </CardTitle>
                                <Badge className="bg-white/20 text-white border-white/50 animate-pulse">
                                    {myCurrentDelivery.delivery_status === 'finding_driver' ? 'ALLER À LA PHARMACIE' : 'EN CHEMIN VERS LE CLIENT'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Récupération</p>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="font-bold text-blue-700">{myCurrentDelivery.pharmacies?.nom}</p>
                                        <p className="text-sm flex items-center gap-2 mt-1">
                                            <Phone className="w-3 h-3 text-slate-400" /> {myCurrentDelivery.pharmacies?.telephone}
                                        </p>
                                    </div>
                                    {myCurrentDelivery.delivery_status === 'finding_driver' && (
                                        <Button onClick={confirmPickup} className="w-full bg-blue-600">Valider la récupération</Button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination</p>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="font-bold">{myCurrentDelivery.delivery_address || "Adresse client"}</p>
                                        <p className="text-xs text-slate-500 mt-1 italic">Vérifiez la position exacte avec le client</p>
                                    </div>
                                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                                        <Navigation className="w-4 h-4" /> Itinéraire Maps
                                    </Button>
                                </div>
                            </div>

                            {myCurrentDelivery.delivery_status === 'on_the_way' && (
                                <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
                                    <p className="text-sm font-bold text-slate-600">Saisissez le code de retrait pour terminer</p>
                                    <div className="flex gap-2 w-full max-w-xs">
                                        <Input 
                                            placeholder="Code PICKUP (ex: 123456)" 
                                            className="text-center font-black tracking-widest text-lg py-6"
                                            value={pickupCode}
                                            onChange={e => setPickupCode(e.target.value)}
                                        />
                                        <Button onClick={confirmDelivery} className="bg-green-600 px-8 py-6">
                                            <CheckCircle className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    /* Available Orders List */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                                <Navigation className="w-5 h-5 text-orange-500" /> Courses disponibles à {livreur.ville}
                            </h3>
                            <Badge variant="outline">{availableOrders.length} New</Badge>
                        </div>

                        {availableOrders.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-slate-200 mx-auto animate-spin" />
                                <p className="text-slate-400 italic">En attente de nouvelles commandes...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {availableOrders.map(order => (
                                    <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="p-6 flex-1 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Pharmacie {order.pharmacies?.nom}</p>
                                                        <p className="font-bold flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-slate-400" /> {order.delivery_address || 'Livraison quartier'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-green-600">+{order.delivery_fee} F</p>
                                                        <p className="text-[10px] text-slate-400">Gain net livreur</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => takeOrder(order.id)}
                                                className="bg-slate-900 text-white p-6 font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-colors"
                                            >
                                                Prendre <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Security Footer */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        N'oubliez pas votre <strong>Sac Isotherme Scellé</strong>. Pour votre sécurité et celle du client, portez toujours votre casque et respectez le code de la route.
                    </p>
                </div>
            </div>
        </div>
    );
};

const ArrowRight = ({ className }: {className?: string}) => (<svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>);
const ShieldCheck = ({ className }: {className?: string}) => (<svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>);


export default LivreurDashboard;
