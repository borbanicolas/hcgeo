/**
 * Enriquece o texto de auditoria com contexto do cliente (versão do app + browser + SO).
 * A versão vem do header X-App-Version enviado pelo frontend.
 * Browser/OS são inferidos do User-Agent (padrão em servidores HTTP).
 */

function parseUserAgent(ua) {
  const s = String(ua || "");

  let os = "Outro";
  if (/Windows NT|Win64|WOW64|Windows/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh|MacIntel/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s) && !/Android/i.test(s)) os = "Linux";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";

  let browser = "Outro";
  if (/Edg(?:e|A|i)?\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if ((/Chrome|CriOS|CrMo/i.test(s)) && !/Edg/i.test(s)) browser = "Chrome";
  else if (/Firefox|FxiOS/i.test(s)) browser = "Firefox";
  else if (/Safari/i.test(s) && !/Chrome|Chromium|Edg/i.test(s)) browser = "Safari";

  return { browser, os };
}

function enrichAuditDetails(req, details) {
  const base = details == null ? "" : String(details);
  if (base.includes("\n[Cliente]")) return base;

  const rawVersion = req.headers["x-app-version"] || req.headers["x-client-version"] || "";
  const version = String(rawVersion).trim() || "—";
  const ua = req.headers["user-agent"] || "";
  const { browser, os } = parseUserAgent(ua);

  return `${base}\n\n[Cliente] App v${version} | ${browser} | ${os}`;
}

module.exports = { enrichAuditDetails, parseUserAgent };
