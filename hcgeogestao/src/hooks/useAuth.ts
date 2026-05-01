import { useEffect, useState, useCallback } from "react";
import { API_URL } from "@/lib/api";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutos em milissegundos
const ACTIVITY_STORAGE_KEY = "hcgeo_last_activity";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  const signOut = useCallback(async () => {
    localStorage.removeItem("hcgeotoken");
    localStorage.removeItem("hcgeouser");
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    sessionStorage.clear(); // Derruba as portas do financeiro
    setSession(null);
    setIsExpired(false);
    window.location.href = "/";
  }, []);

  const handleTimeout = useCallback(async (user: any) => {
    if (!user) return;
    
    try {
      // Log no sistema
      await fetch(`${API_URL}/auth/audit/timeout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, userId: user.id })
      });
    } catch (e) {
      console.error("Erro ao registrar log de expiração:", e);
    }

    setIsExpired(true);
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("hcgeotoken");
    const userStr = localStorage.getItem("hcgeouser");
    const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      // Verifica inatividade logo no carregamento (caso o usuário volte após muito tempo)
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > INACTIVITY_TIMEOUT) {
          handleTimeout(user);
          setLoading(false);
          return;
        }
      }

      try {
        // Verifica a expiração do JWT token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpiredJWT = payload.exp < Math.floor(Date.now() / 1000);
        
        if (isExpiredJWT) {
          throw new Error("Token expirado");
        }

        setSession({ access_token: token, user });
        // Inicializa a atividade se estiver logado mas não houver timestamp
        if (!lastActivity) {
          updateActivity();
        }
      } catch (e) {
        signOut();
      }
    } else {
      setSession(null);
    }
    setLoading(false);
  }, [signOut, updateActivity, handleTimeout]);

  // Sincronização com o Servidor (Ping & Activity)
  useEffect(() => {
    if (!session || isExpired) return;

    const pingServer = async () => {
      try {
        const token = localStorage.getItem("hcgeotoken");
        const res = await fetch(`${API_URL}/auth/ping`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.forceLogout) {
            console.warn("[Auth] Sessão encerrada pelo administrador");
            handleTimeout(session.user);
          }
        } else if (res.status === 401) {
          handleTimeout(session.user);
        }
      } catch (e) {
        console.error("Erro no ping de sessão:", e);
      }
    };

    // Ping inicial e a cada 1 minuto
    pingServer();
    const intervalId = setInterval(pingServer, 60000); 

    return () => clearInterval(intervalId);
  }, [session, isExpired, handleTimeout]);

  // Monitor de Inatividade Local
  useEffect(() => {
    if (!session || isExpired) return;

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > INACTIVITY_TIMEOUT) {
          console.log("[Auth] Sessão expirada por inatividade");
          handleTimeout(session.user);
        }
      } else {
        updateActivity();
      }
    };

    // Listeners para atualizar atividade
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    
    // Throttling para não sobrecarregar o localStorage
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) { // 5 segundos
        updateActivity();
        lastUpdate = now;
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    // Verifica a cada 30 segundos
    const intervalId = setInterval(checkInactivity, 30000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(intervalId);
    };
  }, [session, isExpired, handleTimeout, updateActivity]);

  return { session, loading, isExpired, signOut };
}
