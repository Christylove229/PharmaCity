import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pill, MapPin, Loader2, ArrowLeft, ShieldCheck, Timer } from "lucide-react";
import { getLocationWithFallback, getLocationMessage, GeolocationResult } from "@/utils/geolocation";

const AuthPharmacy = () => {
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
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes en secondes

  const [locationResult, setLocationResult] = useState<GeolocationResult | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans votre espace pharmacie",
      });

      navigate("/dashboard");
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
      // Pour le reset password, Supabase envoie par défaut le code OTP si on utilise {{ .Token }} dans le template
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      
      toast({
        title: "Email envoyé 📩",
        description: "Saisissez le code reçu par mail pour continuer.",
      });
      
      setShowOtpStep(true);
      setTimeLeft(300); // Reset timer à 5 mins
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email.",
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
      // DÉTECTION DU TYPE : 
      // Si on vient de l'inscription (Sign Up), le type est 'signup' 
      // Si on vient de "Mot de passe oublié", le type est 'recovery'
      // NB: On peut vérifier si on est en train de réinitialiser via une variable d'état
      const otpType = showForgotPassword ? 'recovery' : 'signup';

      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail || email,
        token: otpCode,
        type: otpType
      });

      if (error) throw error;

      toast({
        title: "Code validé ! ✅",
        description: "Vous pouvez maintenant changer votre mot de passe.",
      });

      navigate("/auth/change-password");
    } catch (error: any) {
      toast({
        title: "Code invalide",
        description: error.message || "Le code est incorrect ou expiré.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLocationDetection = async () => {
    setLocationLoading(true);
    try {
      const result = await getLocationWithFallback();
      setLocationResult(result);
      
      const message = getLocationMessage(result);
      toast({
        title: message.title,
        description: message.description,
        variant: message.variant,
      });
    } catch (error: any) {
      toast({
        title: "Erreur de localisation",
        description: "Impossible de déterminer votre position. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationResult) {
      toast({
        title: "Localisation requise",
        description: "Veuillez détecter votre localisation.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "pharmacy",
            latitude: locationResult.latitude.toString(),
            longitude: locationResult.longitude.toString(),
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Inscription réussie ✅",
        description: "Vérifiez votre email pour le code de confirmation.",
      });

      setResetEmail(email); // On prépare l'email pour l'OTP
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
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <CardTitle>Vérification de sécurité</CardTitle>
              <CardDescription>
                Saisissez le code à 6 chiffres envoyé à <br />
                <span className="font-bold text-foreground">{resetEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <Label htmlFor="otp">Code de confirmation</Label>
                    <div className="flex items-center text-orange-600">
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
                    <p className="text-xs text-red-500 text-center mt-2">
                      Le code a expiré. Veuillez refaire une demande.
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full bg-blue-600 py-6" disabled={otpLoading || timeLeft === 0}>
                  {otpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Vérifier le code
                </Button>
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground mt-2"
                >
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Changer l'email ou recommencer
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Affichage Mot de passe oublié (Email)
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Pill className="h-12 w-12 text-white mr-3" />
              <h1 className="text-3xl font-bold text-white">PharmaCity PRO</h1>
            </div>
          </div>
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <CardTitle>Récupération de compte</CardTitle>
              <CardDescription>
                Recevez un code de sécurité par email pour accéder à votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email de la pharmacie</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre-pharmacie@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Envoyer le code OTP
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour à la connexion
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Pill className="h-12 w-12 text-white mr-3" />
            <h1 className="text-3xl font-bold text-white">PharmaCity PRO</h1>
          </div>
          <p className="text-white/90">Espace exclusif pour les professionnels</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle>Espace Pharmacie</CardTitle>
            <CardDescription>
              Gérez votre stock et votre vitrine en ligne
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email de la pharmacie</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre-pharmacie@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white" 
                      disabled={loading}
                    >
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full text-center text-sm text-green-600 hover:underline mt-4 block"
                    >
                      Mot de passe oublié ?
                    </button>
                  </form>
                </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email pro de la pharmacie</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre-pharmacie@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe fort</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-medium">Localisation de votre pharmacie</Label>
                    
                    {!locationResult ? (
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleLocationDetection}
                        disabled={locationLoading}
                        className="w-full border-green-200 text-green-700 hover:bg-green-50"
                      >
                        {locationLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Détection GPS en cours...
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Détecter ma localisation
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Position fixée avec succès
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-800 hover:bg-green-100"
                            onClick={handleLocationDetection}
                            disabled={locationLoading}
                          >
                            Refaire le point
                          </Button>
                        </div>
                        <p className="text-xs text-green-600/80 mt-1">
                          {locationResult.latitude.toFixed(6)}, {locationResult.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    disabled={loading || !locationResult}
                  >
                    {loading ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {loading ? "Création du compte..." : "Inscrire ma pharmacie"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPharmacy;
