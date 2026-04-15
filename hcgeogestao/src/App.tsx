import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Clientes from "@/pages/Clientes";
import Propostas from "@/pages/Propostas";
import Obras from "@/pages/Obras";

import Relatorios from "@/pages/Relatorios";
import Estoque from "@/pages/Estoque";

import Colaboradores from "@/pages/Colaboradores";
import Financeiro from "@/pages/Financeiro";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "@/pages/NotFound";
import UsersAdmin from "@/pages/UsersAdmin";
import AuditLog from "@/pages/AuditLog";
import { APP_VERSION } from "@/lib/appVersion";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading } = useAuth();
  if (import.meta.env.DEV) console.info(`[HC GeoGestão] ${APP_VERSION}`);
  if (loading) {
    return (
      //@ts-ignore
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/propostas" element={<Propostas />} />
        <Route path="/obras" element={<Obras />} />
        <Route path="/medicoes" element={<Navigate to="/obras" replace />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/fornecedores" element={<Navigate to="/estoque" replace />} />
        <Route path="/colaboradores" element={<Colaboradores />} />
        <Route path="/usuarios" element={<UsersAdmin />} />
        <Route path="/auditoria" element={<AuditLog />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
