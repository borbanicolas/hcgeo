const { enrichAuditDetails } = require("./auditDetails");

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "0.0.0.0";
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('express').Request} req
 * @param {{ userId: string | null, action: string, tableName: string, recordId: string | null, details: string }} row
 */
async function insertAuditLog(pool, req, { userId, action, tableName, recordId, details }) {
  const ip = clientIp(req);
  const d = enrichAuditDetails(req, details);
  await pool.query(
    "INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)",
    [userId, action, tableName, recordId, d, ip]
  );
}

module.exports = { insertAuditLog, clientIp };
