import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedLivreurRoute = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("denied"); return; }

      const { data: livreur } = await supabase
        .from("livreurs")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (livreur?.status === "active") {
        setStatus("allowed");
      } else {
        setStatus("denied");
      }
    };
    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedLivreurRoute;
