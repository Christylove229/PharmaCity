import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bike, MapPin, Phone, CheckCircle, Package,
  Navigation, AlertTriangle, LogOut, Loader2,
  ShieldCheck, ArrowRight, Map, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DeliveryMap from "@/components/DeliveryMap";

interface LatLng { lat: number; lng: number }

const LivreurDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [livreur, setLivreur] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myCurrentDelivery, setMyCurrentDelivery] = useState<any>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [showMap, setShowMap] = useState(false);

  // Positions pour la carte
  const [livreurPos, setLivreurPos] = useState<LatLng | undefined>();
  const [clientPos, setClientPos] = useState<LatLng | undefined>();
  const [pharmaciePos, setPharmacie] = useState<LatLng | undefined>();

  const geoWatchRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Géolocalisation temps réel du livreur ──
  useEffect(() => {
    if (!navigator.geolocation) return;

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLivreurPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.warn("Géoloc:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (geoWatchRef.current !== null)
        navigator.geolocation.clearWatch(geoWatchRef.current);
    };
  }, []);

  useEffect(() => { loadLivreurData(); }, []);

  const loadLivreurData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: livreurData, error } = await supabase
      .from("livreurs").select("*")
      .eq("user_id", session.user.id).single();

    if (error || !livreurData) { navigate("/"); return; }

    setLivreur(livreurData);
    if (livreurData.status === "active") {
      loadAvailableOrders(livreurData.ville);
      loadMyActiveDelivery(livreurData.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (livreur?.status === 'active') {
       const channel = supabase
         .channel('livreur_orders')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadAvailableOrders(livreur.ville);
            loadMyActiveDelivery(livreur.id);
         })
         .subscribe();
       return () => { supabase.removeChannel(channel); };
    }
  }, [livreur]);

  const loadAvailableOrders = async (ville: string) => {
    console.log("Recherche commandes pour la ville:", ville);
    const { data, error } = await supabase
      .from("orders")
      .select("*, pharmacies!inner(nom, ville, latitude, longitude)")
      .eq("delivery_type", "delivery")
      .eq("delivery_status", "not_started")
      .eq("pharmacies.ville", ville)
      .order("created_at", { ascending: false });
    
    if (error) console.error("Erreur chargement commandes:", error);
    console.log("Commandes trouvées:", data?.length || 0);
    setAvailableOrders(data || []);
  };

  const loadMyActiveDelivery = async (livreurId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*, pharmacies(nom, telephone, ville, latitude, longitude)")
      .eq("livreur_id", livreurId)
      .in("delivery_status", ["finding_driver", "on_the_way"])
      .maybeSingle();

    setMyCurrentDelivery(data || null);

    if (data) {
      // Position client (si sauvegardée)
      if (data.client_latitude && data.client_longitude) {
        setClientPos({ lat: data.client_latitude, lng: data.client_longitude });
      }
      // Position pharmacie
      if (data.pharmacies?.latitude && data.pharmacies?.longitude) {
        setPharmacie({ lat: data.pharmacies.latitude, lng: data.pharmacies.longitude });
      }
    }
  };

  const takeOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ livreur_id: livreur.id, delivery_status: "finding_driver" })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de prendre cette course.", variant: "destructive" });
    } else {
      toast({ title: "Course acceptée ! 🛵", description: "Allez chercher le colis à la pharmacie." });
      loadLivreurData();
    }
  };

  const confirmPickup = async () => {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_status: "on_the_way" })
      .eq("id", myCurrentDelivery.id);
    if (!error) {
      toast({ title: "En chemin ! 🚀", description: "Livrez le colis au client." });
      loadLivreurData();
    }
  };

  const confirmDelivery = async () => {
    if (!pickupCode || pickupCode.trim() !== myCurrentDelivery.pickup_code) {
      toast({ title: "Code d'accès invalide", description: "Ce n'est pas le bon code. Demandez le code exact au client !", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("orders")
      .update({ delivery_status: "delivered", status: "completed" })
      .eq("id", myCurrentDelivery.id);
    if (!error) {
      // Réduire le stock pour la pharmacie
      try {
        const { data: items } = await supabase.from('order_items').select('stock_id, quantite').eq('order_id', myCurrentDelivery.id);
        if (items) {
          for (const item of items) {
             const { data: s } = await supabase.from('stocks').select('quantite').eq('id', item.stock_id).single();
             if (s) {
                await supabase.from('stocks').update({ quantite: Math.max(0, s.quantite - item.quantite) }).eq('id', item.stock_id);
             }
          }
        }
      } catch (err) {
        console.error("Erreur réduction stock:", err);
      }

      toast({ title: "Livré ! 🎊", description: "Course terminée. Votre gain a été crédité." });
      setMyCurrentDelivery(null);
      setPickupCode("");
      setClientPos(undefined);
      setPharmacie(undefined);
      setShowMap(false);
      loadLivreurData();
    }
  };

  const openInGoogleMaps = () => {
    if (!clientPos) {
      const addr = encodeURIComponent(myCurrentDelivery?.delivery_address || "");
      window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, "_blank");
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${clientPos.lat},${clientPos.lng}`,
        "_blank"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="animate-spin text-green-600 w-10 h-10" />
      </div>
    );
  }

  if (livreur?.status === "pending") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold">Compte en attente de validation</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          L'administrateur PharmaCity vérifie vos documents. Vous recevrez une notification dès que vous pourrez commencer à livrer.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{livreur.nom}</h2>
              <p className="text-xs text-slate-500 font-mono uppercase">Plaque : {livreur.plaque_immatriculation}</p>
              {livreurPos && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> GPS actif
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
            <LogOut className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

        {/* ── Course en cours ── */}
        {myCurrentDelivery ? (
          <Card className="border-2 border-green-500 shadow-xl overflow-hidden">
            <CardHeader className="bg-green-600 text-white">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" /> Course en cours
                </CardTitle>
                <Badge className="bg-white/20 text-white border-white/50 animate-pulse">
                  {myCurrentDelivery.delivery_status === "finding_driver"
                    ? "ALLER À LA PHARMACIE"
                    : "EN CHEMIN VERS LE CLIENT"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {/* Infos pharmacie & client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📍 Récupération</p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-green-700">{myCurrentDelivery.pharmacies?.nom}</p>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {myCurrentDelivery.pharmacies?.telephone}
                    </p>
                    
                    {myCurrentDelivery.delivery_status === "finding_driver" && (
                      <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg text-center shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Annoncez ce N° de Commande</p>
                        <p className="font-mono text-2xl font-black text-slate-900 tracking-[0.2em]">{myCurrentDelivery.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    )}
                  </div>
                  {myCurrentDelivery.delivery_status === "finding_driver" && (
                    <Button onClick={confirmPickup} className="w-full bg-green-600 hover:bg-green-700">
                      ✅ Valider la récupération
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📦 Destination</p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold">{myCurrentDelivery.delivery_address || "Adresse client"}</p>
                    
                    {/* Infos Destinataire */}
                    {(myCurrentDelivery.destinataire_nom || myCurrentDelivery.destinataire_telephone) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">À remettre à :</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                           <User className="w-4 h-4 text-green-600" />
                           {myCurrentDelivery.destinataire_nom || "Le Client"}
                        </p>
                        {myCurrentDelivery.destinataire_telephone && (
                          <a href={`tel:${myCurrentDelivery.destinataire_telephone}`} className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-bold text-sm">
                            <Phone className="w-3.5 h-3.5" /> Appeler : {myCurrentDelivery.destinataire_telephone}
                          </a>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2 italic flex items-center gap-1">
                      {clientPos
                        ? `📍 ${clientPos.lat.toFixed(4)}, ${clientPos.lng.toFixed(4)}`
                        : "Position GPS du client non disponible"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={openInGoogleMaps}
                    >
                      <Navigation className="w-4 h-4" /> Google Maps
                    </Button>
                    <Button
                      variant={showMap ? "default" : "outline"}
                      className={showMap ? "bg-green-600 text-white" : ""}
                      onClick={() => setShowMap(!showMap)}
                    >
                      <Map className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── CARTE ── */}
              {showMap && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Map className="w-4 h-4" /> Carte de livraison
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    <DeliveryMap
                      livreurPos={livreurPos}
                      clientPos={
                        clientPos
                          ? { ...clientPos, label: myCurrentDelivery.delivery_address }
                          : undefined
                      }
                      pharmaciePos={
                        pharmaciePos
                          ? { ...pharmaciePos, label: myCurrentDelivery.pharmacies?.nom }
                          : undefined
                      }
                      height="300px"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="text-base">🛵</span> Vous</span>
                    <span className="flex items-center gap-1"><span className="text-base">📦</span> Client</span>
                    <span className="flex items-center gap-1"><span className="text-base">💊</span> Pharmacie</span>
                  </div>
                </div>
              )}

              {/* Code de livraison */}
              {myCurrentDelivery.delivery_status === "on_the_way" && (
                <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
                  <p className="text-sm font-bold text-slate-600">Saisissez le code de retrait pour terminer</p>
                  <div className="flex gap-2 w-full max-w-xs">
                    <Input
                      placeholder="Code PICKUP (ex: 123456)"
                      className="text-center font-black tracking-widest text-lg py-6"
                      value={pickupCode}
                      onChange={e => setPickupCode(e.target.value)}
                    />
                    <Button onClick={confirmDelivery} className="bg-green-600 hover:bg-green-700 px-8 py-6">
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ── Courses disponibles ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Navigation className="w-5 h-5 text-orange-500" /> Courses disponibles à {livreur.ville}
              </h3>
              <Badge variant="outline">{availableOrders.length} dispo</Badge>
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
                            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">
                              Pharmacie {order.pharmacies?.nom}
                            </p>
                            <p className="font-bold flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {order.delivery_address || "Livraison quartier"}
                            </p>
                            {order.client_latitude && order.client_longitude && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Position GPS disponible
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <p className="text-xl font-black text-green-600">{order.prix_total} FCFA</p>
                            <Badge className="bg-green-600 text-white text-[8px] h-4">✅ PAYÉ</Badge>
                            <p className="text-[10px] text-slate-400">Total commande</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => takeOrder(order.id)}
                        className="bg-slate-900 text-white p-6 font-bold flex items-center justify-center gap-2 group-hover:bg-green-600 transition-colors"
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

        {/* ── Sécurité ── */}
        <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-[11px] text-slate-500 leading-relaxed italic">
            N'oubliez pas votre <strong>Sac Isotherme Scellé</strong>. Pour votre sécurité et celle du client, portez toujours votre casque et respectez le code de la route.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LivreurDashboard;
