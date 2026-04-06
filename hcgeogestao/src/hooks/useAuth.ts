import { useEffect, useState } from "react";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hcgeotoken");
    const userStr = localStorage.getItem("hcgeouser");
    
    if (token && userStr) {
      try {
        // Verifica a expiração do JWT token (1 hora)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp < Math.floor(Date.now() / 1000);
        
        if (isExpired) {
          throw new Error("Token expirado");
        }

        setSession({ access_token: token, user: JSON.parse(userStr) });
      } catch (e) {
        localStorage.removeItem("hcgeotoken");
        localStorage.removeItem("hcgeouser");
        setSession(null);
      }
    } else {
      setSession(null);
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
    localStorage.removeItem("hcgeotoken");
    localStorage.removeItem("hcgeouser");
    sessionStorage.clear(); // Derruba as portas do financeiro
    setSession(null);
    window.location.href = "/";
  };

  return { session, loading, signOut };
}
