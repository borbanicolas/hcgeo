/**
 * Versão exibida no app e enviada em `X-App-Version` para a API (logs de auditoria).
 * Preferência: variável `VITE_APP_VERSION` no `.env`; senão o fallback abaixo (altere ao publicar).
 */
export const APP_VERSION = (import.meta.env.VITE_APP_VERSION || "1.0.25").trim();
