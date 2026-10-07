// Calls to the analysis API (/api/strategy).

// The beta access code is validated server-side. It is entered on the home
// page, which stores it in sessionStorage; we replay it here as a header so
// the planner can call the gated AI endpoints. If it is missing, the API
// returns 401 and the user is asked to enter it again.
export const BETA_KEY = 'hq_beta';

export function betaHeaders(): Record<string, string> {
  let code = '';
  try { code = sessionStorage.getItem(BETA_KEY)?.trim() || ''; } catch {}
  return { 'Content-Type': 'application/json', 'x-beta-code': code };
}

export function messageForStatus(status: number): string {
  if (status === 401) return 'Invalid beta access code — please re-enter it.';
  if (status === 402) return 'An active HuntQuarters membership is required.';
  if (status === 429) return 'Too many requests — please wait a few minutes and try again.';
  return 'Engine error during analysis. Please try again.';
}

// POST with a hard client timeout, so a stalled request ends in a retryable
// error instead of an endless loading overlay. The hunter's answers live in
// page state and are untouched on failure.
const REQUEST_TIMEOUT_MS = 90_000;

export async function postStrategy(body: unknown): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch('/api/strategy', {
      method: 'POST',
      headers: betaHeaders(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const failureMessage = (err: unknown, what: string) =>
  err instanceof DOMException && err.name === 'AbortError'
    ? `${what} took too long. Your answers are saved — try again.`
    : `${what} failed — check your connection and try again. Your answers are saved.`;
