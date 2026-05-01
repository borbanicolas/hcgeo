import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { API_URL } from "@/lib/api";
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
import { SessionTimeoutModal } from "@/components/auth/SessionTimeoutModal";

const queryClient = new QueryClient();

const logErrorToApi = async (message: string, details: any, component = "Global") => {
  try {
    const token = localStorage.getItem("hcgeotoken");
    await fetch(`${API_URL}/auth/audit/error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ message, details: typeof details === 'string' ? details : String(details), component })
    });
  } catch (e) {
    console.error("Failed to log error to backend", e);
  }
};

function AppRoutes() {
  const { session, loading, isExpired, signOut } = useAuth();
  console.log("v:", APP_VERSION)
  console.info(`[HC GeoGestão] ${APP_VERSION}`);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logErrorToApi(event.message, event.error?.stack || event.error, "window.onerror");
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logErrorToApi(
        event.reason?.message || "Unhandled Promise Rejection",
        event.reason?.stack || event.reason,
        "window.unhandledrejection"
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (loading) {
    return (
      //@ts-ignore
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  if (!session && !isExpired) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <SessionTimeoutModal isOpen={isExpired} onConfirm={signOut} />
      {!isExpired && (
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
      )}
    </>
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
