// Server-side beta access gate.
//
// The access code lives in the BETA_ACCESS_CODE env var — NOT in the client
// JS bundle. Clients send it on every request via the `x-beta-code` header,
// and the API route is the sole enforcer. This means a random visitor who
// opens the page source can no longer read the code, and the AI endpoints
// cannot be called without it.
//
// Set BETA_ACCESS_CODE in .env.local (and in your Vercel project env). If it
// is unset we fall back to the legacy code so existing testers aren't locked
// out, but you should set it explicitly before sharing the beta widely.
const BETA_CODE = (process.env.BETA_ACCESS_CODE ?? "SCOUT2026").trim().toUpperCase();

export function hasValidBetaAccess(req: Request): boolean {
  const provided = (req.headers.get("x-beta-code") ?? "").trim().toUpperCase();
  return provided.length > 0 && provided === BETA_CODE;
}
