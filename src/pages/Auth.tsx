import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Pill, Loader2, ArrowLeft, ShieldCheck, Timer,
  ShoppingBag, Bike, User, Mail, Lock, Phone, MapPin
} from "lucide-react";

type AppRole = "client" | "livreur";

// ✅ FIX 2 — Validation mot de passe fort
const isPasswordStrong = (pwd: string): boolean => {
  return pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd);
};

const Auth = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [authTab, setAuthTab] = useState("signin");

  // Client states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // ✅ FIX 1 — Cooldown mot de passe oublié
  const [resetCooldown, setResetCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  // Livreur states
  const [livreurStep, setLivreurStep] = useState(1);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [livreurForm, setLivreurForm] = useState({
    nom: "", email: "", telephone: "", password: "",
    ville: "", vehicule_type: "", plaque: ""
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    let timer: NodeJS.Timeout;
    if (showOtpStep && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [navigate, showOtpStep, timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ──────────────────── CLIENT HANDLERS ────────────────────

  const handleClientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: livreur } = await supabase
        .from("livreurs")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (livreur) {
        if (livreur.status === "active") {
          toast({ title: "Connexion livreur 🛵", description: "Redirection vers votre tableau de bord." });
          navigate("/dashboard/livreur");
          return;
        }
        if (livreur.status === "pending") {
          setIsPendingReview(true);
          await supabase.auth.signOut();
          return;
        }
      }

      toast({ title: "Bienvenue ! 👋", description: "Vous êtes connecté." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Erreur de connexion", description: error.message || "Email ou mot de passe incorrect.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // ✅ FIX 2 — Vérification mot de passe fort
    if (!isPasswordStrong(password)) {
      toast({
        title: "Mot de passe trop faible",
        description: "8 caractères minimum, une majuscule et un chiffre requis.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { role: "client" } }
      });
      if (error) throw error;
      toast({ title: "Code envoyé ✅", description: "Vérifiez votre email." });
      setResetEmail(email);
      setShowOtpStep(true);
      setTimeLeft(300);
    } catch (error: any) {
      toast({ title: "Erreur d'inscription", description: error.message || "Une erreur est survenue lors de la création de votre compte.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX 1 — handleForgotPassword avec cooldown anti-spam
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCooldown) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      toast({ title: "Code envoyé 📩", description: "Vérifiez votre email." });
      setShowOtpStep(true);
      setTimeLeft(300);

      // Cooldown 60 secondes
      setResetCooldown(true);
      setCooldownSeconds(60);
      const interval = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setResetCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail || email,
        token: otpCode,
        type: showForgotPassword ? "recovery" : "signup"
      });
      if (error) throw error;
      if (showForgotPassword) {
        navigate("/auth/change-password");
      } else {
        toast({ title: "Compte vérifié ! ✅" });
        navigate("/");
      }
    } catch (error: any) {
      toast({ title: "Code invalide", description: error.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  // ──────────────────── LIVREUR HANDLERS ────────────────────

  const handleLivreurSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: livreurForm.email,
        password: livreurForm.password,
      });
      if (error) throw error;

      const { data: livreur } = await supabase
        .from("livreurs")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!livreur) {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'est pas enregistré comme livreur.");
      }
      if (livreur.status === "pending") {
        setIsPendingReview(true);
        await supabase.auth.signOut();
        return;
      }
      if (livreur.status === "suspended") {
        await supabase.auth.signOut();
        throw new Error("Compte suspendu. Contactez le support.");
      }

      toast({ title: "Connexion réussie 🛵", description: "Prêt pour vos courses !" });
      navigate("/dashboard/livreur");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLivreurSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // ✅ FIX 2 — Vérification mot de passe fort pour livreur
    if (!isPasswordStrong(livreurForm.password)) {
      toast({
        title: "Mot de passe trop faible",
        description: "8 caractères minimum, une majuscule et un chiffre requis.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // ✅ FIX 3 — Validation numéro de téléphone
    const phoneRegex = /^\+?[0-9\s]{8,15}$/;
    if (!phoneRegex.test(livreurForm.telephone)) {
      toast({
        title: "Numéro invalide",
        description: "Entrez un numéro de téléphone valide (ex: +229 00 00 00 00).",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: livreurForm.email,
        password: livreurForm.password,
        options: { data: { role: "livreur" } }
      });
      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from("livreurs").insert([{
          user_id: authData.user.id,
          nom: livreurForm.nom,
          telephone: livreurForm.telephone,
          ville: livreurForm.ville,
          vehicule_type: livreurForm.vehicule_type,
          plaque_immatriculation: livreurForm.plaque,
          status: "pending"
        }]);
        if (profileError) throw profileError;
        setIsPendingReview(true);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────── VIEWS ────────────────────

  if (isPendingReview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center p-8">
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 mb-4">
            Dossier en cours de validation
          </CardTitle>
          <p className="text-slate-600 leading-relaxed mb-8">
            Votre inscription est bien reçue. Notre équipe va examiner votre dossier
            et vous contactera par <strong>téléphone ou SMS</strong> une fois votre compte activé.
            <br /><br />
            <strong>Revenez ici pour vous connecter après activation.</strong>
          </p>
          <Button onClick={() => { setIsPendingReview(false); setRole(null); }} className="w-full bg-green-600 hover:bg-green-700 py-6">
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  if (showOtpStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-none ring-1 ring-slate-200">
            <CardHeader className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <CardTitle>Vérification du compte</CardTitle>
              <CardDescription>
                Code envoyé à <strong>{resetEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <Label htmlFor="otp">Code de sécurité</Label>
                    <div className="flex items-center text-green-600 font-mono bg-green-50 px-2 py-1 rounded">
                      <Timer className="h-3 w-3 mr-1" />
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                  <Input
                    id="otp"
                    placeholder="12345678"
                    className="text-center text-2xl tracking-[0.4em] font-bold py-8 h-12"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    maxLength={8}
                    required
                  />
                  {timeLeft === 0 && (
                    <p className="text-xs text-red-500 text-center">Code expiré. Veuillez recommencer.</p>
                  )}
                </div>
                <Button type="submit" className="w-full py-7 text-lg bg-green-600 hover:bg-green-700" disabled={otpLoading || timeLeft === 0}>
                  {otpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmer le code"}
                </Button>
                <button type="button" onClick={() => setShowOtpStep(false)}
                  className="w-full text-sm text-center text-slate-500 hover:text-green-600 flex items-center justify-center">
                  <ArrowLeft className="h-3 w-3 mr-1" /> Modifier l'email
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="bg-green-600 text-white p-3 rounded-xl shadow-lg inline-block mb-4 mx-auto">
                <Pill className="h-8 w-8" />
              </div>
              <CardTitle>Récupérer mon accès</CardTitle>
              <CardDescription>Un code OTP vous sera envoyé par email.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email enregistré</Label>
                  <Input id="reset-email" type="email" placeholder="votre@email.com"
                    value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                </div>

                {/* ✅ FIX 1 — Bouton avec cooldown affiché */}
                <Button
                  type="submit"
                  className="w-full py-6 bg-green-600 hover:bg-green-700"
                  disabled={resetLoading || resetCooldown}
                >
                  {resetLoading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : resetCooldown
                    ? `Réessayer dans ${cooldownSeconds}s`
                    : "Recevoir le code OTP"}
                </Button>

                <button type="button" onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-center text-slate-500 hover:text-green-600">
                  <ArrowLeft className="h-4 w-4 inline mr-1" /> Retour à la connexion
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ──── SÉLECTION DU RÔLE ────
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="bg-white/20 text-white p-4 rounded-2xl shadow-xl inline-block mb-4 backdrop-blur-sm">
              <Pill className="h-12 w-12" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">PharmaCity</h1>
            <p className="text-green-100 mt-2 font-medium">Votre santé, à portée de main</p>
          </div>

          <Card className="shadow-2xl border-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Qui êtes-vous ?</CardTitle>
              <CardDescription>Choisissez votre profil pour continuer</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6 space-y-4">
              <button
                onClick={() => setRole("client")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-green-100 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="bg-green-100 text-green-600 p-3 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 text-lg">Je suis Client</p>
                  <p className="text-sm text-slate-500">Acheter et me faire livrer des médicaments</p>
                </div>
              </button>

              <button
                onClick={() => setRole("livreur")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-green-100 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="bg-green-100 text-green-600 p-3 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all">
                  <Bike className="h-7 w-7" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 text-lg">Je suis Livreur</p>
                  <p className="text-sm text-slate-500">Livrer des commandes et gagner de l'argent</p>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ──── FORMULAIRE CLIENT ────
  if (role === "client") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => setRole(null)}
            className="flex items-center text-sm text-slate-500 hover:text-green-600 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Changer de profil
          </button>

          <div className="text-center mb-8">
            <div className="bg-green-600 text-white p-3 rounded-2xl shadow-xl inline-block mb-4">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-extrabold">Espace Client</h1>
            <p className="text-slate-500 mt-1">Vos médicaments, livrés chez vous</p>
          </div>

          <Card className="shadow-2xl border-none ring-1 ring-slate-200">
            <CardContent className="pt-6">
              <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="signin" className="rounded-lg py-3">Connexion</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg py-3">Inscription</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleClientSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="nom@exemple.com"
                        value={email} onChange={e => setEmail(e.target.value)} required className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input id="password" type="password" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full py-7 text-lg bg-green-600 hover:bg-green-700 shadow-xl mt-4" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
                    </Button>
                    <button type="button" onClick={() => setShowForgotPassword(true)}
                      className="w-full text-center text-sm text-green-600 font-medium hover:underline mt-2">
                      Mot de passe oublié ?
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleClientSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Votre Email</Label>
                      <Input id="signup-email" type="email" placeholder="nom@exemple.com"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Créer un mot de passe</Label>
                      <Input id="signup-password" type="password" placeholder="8 caractères, 1 majuscule, 1 chiffre"
                        value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                      {/* ✅ FIX 2 — Indicateur visuel des règles */}
                      <ul className="text-xs text-slate-400 space-y-1 mt-1">
                        <li className={password.length >= 8 ? "text-green-600" : ""}>
                          {password.length >= 8 ? "✓" : "○"} 8 caractères minimum
                        </li>
                        <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                          {/[A-Z]/.test(password) ? "✓" : "○"} Une lettre majuscule
                        </li>
                        <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                          {/[0-9]/.test(password) ? "✓" : "○"} Un chiffre
                        </li>
                      </ul>
                    </div>
                    <Button type="submit" className="w-full py-7 text-lg bg-green-600 hover:bg-green-700 shadow-xl mt-4" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer mon compte"}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-2 leading-relaxed">
                      Un code de confirmation vous sera envoyé par email.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ──── FORMULAIRE LIVREUR ────
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <button onClick={() => setRole(null)}
          className="flex items-center text-sm text-slate-500 hover:text-green-600 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Changer de profil
        </button>

        <Card className="shadow-2xl border-none">
          <CardHeader className="text-center space-y-1 bg-green-600 text-white rounded-t-xl py-8">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-black italic tracking-tighter text-white">PHARMACITY LIVREUR</CardTitle>
            <CardDescription className="text-green-100 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Partenaire de confiance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-8">
            <Tabs value={authTab} onValueChange={(v) => { setAuthTab(v); setLivreurStep(1); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="signin" className="rounded-lg py-3">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg py-3">Devenir partenaire</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleLivreurSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-green-600" /> Email professionnel</Label>
                    <Input type="email" required disabled={loading} placeholder="livreur@pharmacity.bj"
                      value={livreurForm.email} onChange={e => setLivreurForm({ ...livreurForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> Mot de passe</Label>
                    <Input type="password" required disabled={loading}
                      value={livreurForm.password} onChange={e => setLivreurForm({ ...livreurForm, password: e.target.value })} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold shadow-lg shadow-green-500/20">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleLivreurSignUp} className="space-y-6">
                  {livreurStep === 1 ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><User className="w-4 h-4 text-green-600" /> Nom complet</Label>
                        <Input required disabled={loading} placeholder="Jean Dupont"
                          value={livreurForm.nom} onChange={e => setLivreurForm({ ...livreurForm, nom: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-green-600" /> Email</Label>
                        <Input required disabled={loading} type="email" placeholder="livreur@pharmacity.bj"
                          value={livreurForm.email} onChange={e => setLivreurForm({ ...livreurForm, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-600" /> Téléphone (MoMo)</Label>
                        <Input required disabled={loading} placeholder="+229 00 00 00 00"
                          value={livreurForm.telephone} onChange={e => setLivreurForm({ ...livreurForm, telephone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> Mot de passe</Label>
                        <Input required disabled={loading} type="password" minLength={8}
                          value={livreurForm.password} onChange={e => setLivreurForm({ ...livreurForm, password: e.target.value })} />
                        {/* ✅ FIX 2 — Indicateur visuel pour livreur aussi */}
                        <ul className="text-xs text-slate-400 space-y-1 mt-1">
                          <li className={livreurForm.password.length >= 8 ? "text-green-600" : ""}>
                            {livreurForm.password.length >= 8 ? "✓" : "○"} 8 caractères minimum
                          </li>
                          <li className={/[A-Z]/.test(livreurForm.password) ? "text-green-600" : ""}>
                            {/[A-Z]/.test(livreurForm.password) ? "✓" : "○"} Une lettre majuscule
                          </li>
                          <li className={/[0-9]/.test(livreurForm.password) ? "text-green-600" : ""}>
                            {/[0-9]/.test(livreurForm.password) ? "✓" : "○"} Un chiffre
                          </li>
                        </ul>
                      </div>
                      <Button type="button" onClick={() => setLivreurStep(2)}
                        className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold shadow-lg shadow-green-500/20">
                        Continuer vers Infos Véhicule
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" /> Votre Ville</Label>
                        <Input required disabled={loading} placeholder="Cotonou / Parakou / Porto-Novo..."
                          value={livreurForm.ville} onChange={e => setLivreurForm({ ...livreurForm, ville: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Bike className="w-4 h-4 text-green-600" /> Type de Véhicule</Label>
                        <select required
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                          value={livreurForm.vehicule_type}
                          onChange={e => setLivreurForm({ ...livreurForm, vehicule_type: e.target.value })}>
                          <option value="">Sélectionner un type</option>
                          <option value="moto">Moto</option>
                          <option value="voiture">Voiture</option>
                          <option value="velo">Vélo / E-Bike</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> Plaque d'immatriculation</Label>
                        <Input required disabled={loading} placeholder="Ex: AD 4567" className="uppercase"
                          value={livreurForm.plaque} onChange={e => setLivreurForm({ ...livreurForm, plaque: e.target.value })} />
                      </div>
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800 leading-relaxed italic">
                        ⚠️ Votre compte sera examiné par notre équipe. Une fois validé, vous pourrez vous connecter et prendre des courses.
                      </div>
                      <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setLivreurStep(1)} className="w-1/3 py-6">Retour</Button>
                        <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 py-6 text-lg font-bold">
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Envoyer mon dossier"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;