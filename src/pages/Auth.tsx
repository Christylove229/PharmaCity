import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pill, Loader2, ArrowLeft, ShieldCheck, Timer } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // États pour l'OTP
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Gestion du timer
    let timer: NodeJS.Timeout;
    if (showOtpStep && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [navigate, showOtpStep, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Heureux de vous revoir !",
        description: "Vous êtes bien connecté à Medoc.",
      });

      if (data.user?.user_metadata?.role === 'pharmacy') {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Vérifiez vos identifiants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      
      toast({
        title: "Code envoyé 📩",
        description: "Un code OTP a été envoyé à votre adresse email.",
      });
      
      setShowOtpStep(true);
      setTimeLeft(300);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le code.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      // Détecter si on est en récupération de mot de passe ou en simple inscription
      const isRecovery = showForgotPassword;
      
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail || email,
        token: otpCode,
        type: isRecovery ? 'recovery' : 'signup'
      });

      if (error) throw error;

      if (isRecovery) {
        toast({ title: "Code validé ! ✅", description: "Changez votre mot de passe." });
        navigate("/auth/change-password");
      } else {
        toast({ title: "Compte vérifié ! ✅", description: "Bienvenue sur Medoc." });
        navigate("/");
      }
    } catch (error: any) {
      toast({ title: "Code invalide", description: error.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "client"
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Code de confirmation envoyé ✅",
        description: "Merci de saisir le code reçu par mail.",
      });

      setResetEmail(email);
      setShowOtpStep(true);
      setTimeLeft(300);
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Affichage de l'étape OTP
  if (showOtpStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-primary/10">
            <CardHeader className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <CardTitle>Vérification du compte</CardTitle>
              <CardDescription>
                Entrez le code à 6 chiffres envoyé à <br />
                <span className="font-bold text-slate-900">{resetEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <Label htmlFor="otp">Code de sécurité</Label>
                    <div className="flex items-center text-primary font-mono bg-primary/5 px-2 py-1 rounded">
                      <Timer className="h-3 w-3 mr-1" />
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                  <Input
                    id="otp"
                    placeholder="12345678"
                    className="text-center text-2xl tracking-[0.4em] font-bold py-8 h-12"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={8}
                    required
                  />
                  {timeLeft === 0 && (
                    <p className="text-xs text-destructive text-center mt-2 font-medium">
                      Ce code a expiré. Merci de redemander un nouvel envoi.
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full py-7 text-lg shadow-lg" disabled={otpLoading || timeLeft === 0}>
                  {otpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmer le code
                </Button>
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="w-full text-sm text-slate-500 hover:text-primary mt-2 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Modifier l'email ou recommencer
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Mot de passe oublié (Email)
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-primary text-white p-3 rounded-xl shadow-lg inline-block mb-4">
              <Pill className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Medoc</h1>
          </div>
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle>Récupérer mon accès</CardTitle>
              <CardDescription>
                Nous allons vous envoyer un code OTP pour changer votre mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email enregistré</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full py-6" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Recevoir le code OTP
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-center text-slate-500"
                >
                  Se connecter plutôt
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="bg-primary text-white p-3 rounded-2xl shadow-xl inline-block mb-4 animate-pulse">
            <Pill className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Medoc</h1>
          <p className="text-slate-500 mt-2 font-medium">Votre santé, notre priorité.</p>
        </div>

        <Card className="shadow-2xl border-none ring-1 ring-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Espace Client</CardTitle>
            <CardDescription className="text-md">
              Rejoignez-nous pour vos soins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="signin" className="rounded-lg py-3">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg py-3">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 border-slate-200 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full py-7 text-lg shadow-blue-200 shadow-xl mt-4" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connexion"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="w-full text-center text-sm text-primary font-medium hover:underline mt-4"
                  >
                    Mot de passe oublié ?
                  </button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Votre Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Créer un mot de passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="6 caractères minimum"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full py-7 text-lg shadow-xl mt-4" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer mon compte"}
                  </Button>
                  <p className="text-center text-xs text-slate-400 mt-4 px-4 leading-relaxed">
                    En vous inscrivant, vous recevrez un code de confirmation par email.
                  </p>
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