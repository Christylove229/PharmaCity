import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bike, User, MapPin, ShieldCheck, Mail, Lock, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthLivreur = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Info perso, 2: Véhicule & Documents
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nom: "",
        telephone: "",
        ville: "",
        vehicule_type: "moto",
        plaque: ""
    });
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Création du compte utilisateur auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insertion dans la table livreurs (en attente de validation admin)
                const { error: profileError } = await supabase.from("livreurs").insert([
                    {
                        user_id: authData.user.id,
                        nom: formData.nom,
                        telephone: formData.telephone,
                        ville: formData.ville,
                        vehicule_type: formData.vehicule_type,
                        plaque_immatriculation: formData.plaque,
                        status: 'pending' // Important : bloqué par défaut
                    }
                ]);

                if (profileError) throw profileError;

                toast({
                    title: "Demande envoyée ! 🚀",
                    description: "Votre dossier est en cours d'examen. Nous vous contacterons une fois votre compte activé.",
                });
                navigate("/");
            }
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl border-none">
                <CardHeader className="text-center space-y-1 bg-blue-600 text-white rounded-t-xl py-8">
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Bike className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-black italic tracking-tighter">MEDOC PARTENAIRE</CardTitle>
                    <CardDescription className="text-blue-100 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Devenez livreur de confiance
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 px-6 pb-8">
                    <form onSubmit={handleSignup} className="space-y-6">
                        {step === 1 ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><User className="w-4 h-4 text-blue-600" /> Nom complet</Label>
                                        <Input disabled={isLoading} required placeholder="Jean Dupont" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /> Email</Label>
                                        <Input disabled={isLoading} required type="email" placeholder="livreur@medoc.bj" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-600" /> Numéro Téléphone (MoMo)</Label>
                                        <Input disabled={isLoading} required placeholder="+229 00 00 00 00" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Lock className="w-4 h-4 text-blue-600" /> Mot de passe</Label>
                                        <Input disabled={isLoading} required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                </div>
                                <Button type="button" onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold shadow-lg shadow-blue-500/20">
                                    Continuer vers Infos Véhicule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Votre Ville</Label>
                                    <Input disabled={isLoading} required placeholder="Cotonou / Parakou / Porto-Novo..." value={formData.ville} onChange={e => setFormData({...formData, ville: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Bike className="w-4 h-4 text-blue-600" /> Type de Véhicule</Label>
                                    <select 
                                        required
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.vehicule_type}
                                        onChange={e => setFormData({...formData, vehicule_type: e.target.value})}
                                    >
                                        <option value="">Sélectionner un type</option>
                                        <option value="moto">Moto</option>
                                        <option value="voiture">Voiture</option>
                                        <option value="velo">Vélo / E-Bike</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Plaque d'immatriculation</Label>
                                    <Input disabled={isLoading} required placeholder="Ex: AD 4567" className="uppercase" value={formData.plaque} onChange={e => setFormData({...formData, plaque: e.target.value})} />
                                </div>

                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800 leading-relaxed italic">
                                    ⚠️ Votre compte sera soumis à une validation manuelle. Assurez-vous que vos informations sont exactes. Une vérification de pièce d'identité sera demandée lors de votre entretien d'activation.
                                </div>

                                <div className="flex gap-4">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3 py-6">Retour</Button>
                                    <Button type="submit" disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 py-6 text-lg font-bold">
                                        {isLoading ? "Envoi..." : "Envoyer mon dossier"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AuthLivreur;
