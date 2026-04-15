import { APP_VERSION } from "@/lib/appVersion";

/** Headers para JSON + Bearer (rotas /api e /auth). */
export function apiJsonHeaders(token: string | null | undefined): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Version": APP_VERSION,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Só auth + versão (ex.: GET sem body, upload FormData). */
export function apiAuthHeaders(token: string | null | undefined): Record<string, string> {
  const h: Record<string, string> = { "X-App-Version": APP_VERSION };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}
