import { useState } from "react";
import { motion } from "framer-motion";
import { Drill, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";
import { apiJsonHeaders } from "@/lib/apiClient";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (loading) return false;
    setLoading(true);

    const endpoint = isSignUp ? "/auth/register" : "/auth/signin";
    const actionName = isSignUp ? "Registro" : "Login";

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: apiJsonHeaders(null),
        body: JSON.stringify({ email, password })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: "Servidor não retornou um JSON válido." };
      }

      if (!res.ok) {
        throw new Error(data.error || `Falha no ${actionName}`);
      }

      if (data.session && data.session.access_token) {
        localStorage.setItem("hcgeotoken", data.session.access_token);
        localStorage.setItem("hcgeouser", JSON.stringify(data.user));
        localStorage.setItem("hcgeo_last_activity", Date.now().toString());
        window.location.href = "/";
      }

    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      console.error(`[AUTH] ${actionName} falhou:`, msg);

      try {
        toast({
          title: `Erro de ${actionName}`,
          description: msg,
          variant: "destructive",
        });
      } catch (toastErr) {
        alert(`Erro de ${actionName}: ` + msg);
      }
    } finally {
      setLoading(false);
    }

    return false;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/20">
            <Drill className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">GeoManager</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isSignUp ? "Crie sua conta para começar" : "Acesse sua conta para gerenciar leads e obras"}
          </p>
        </div>

        <div className="space-y-5" onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(e as any); }}>
          <div className="space-y-2">
            <Label htmlFor="email">Email Corporativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10 h-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => handleAuth()}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-semibold transition-all active:scale-[0.98]"
          >
            {loading
              ? (isSignUp ? "Registrando..." : "Autenticando...")
              : (isSignUp ? "Criar Minha Conta" : "Entrar no Sistema")
            }
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline font-medium"
            >

            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
