// Google Identity Services (GIS) token model.
// The access token lives only in memory: nothing is written to localStorage, cookies or a server.

export const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid',
  'email',
].join(' ');

export interface Session {
  accessToken: string;
  expiresAt: number; // epoch ms
}

function waitForGis(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('Google Identity Services script could not be loaded. Check your connection or ad blocker.'));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let pending: { resolve: (s: Session) => void; reject: (e: Error) => void } | null = null;

export async function initAuth(clientId: string): Promise<void> {
  await waitForGis();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp) => {
      const p = pending;
      pending = null;
      if (!p) return;
      if (resp.error || !resp.access_token) {
        p.reject(new Error(resp.error_description || resp.error || 'Authorization failed'));
        return;
      }
      if (!google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/analytics.readonly')) {
        p.reject(new Error('Google Analytics read access was not granted. Please allow it on the consent screen.'));
        return;
      }
      p.resolve({
        accessToken: resp.access_token,
        expiresAt: Date.now() + Number(resp.expires_in) * 1000,
      });
    },
    error_callback: (err) => {
      const p = pending;
      if (!p) return;
      if (err.type === 'popup_closed') {
        // GIS can report popup_closed slightly before the token callback arrives
        // (the popup closes itself after consent). Give the success callback a grace period.
        setTimeout(() => {
          if (pending !== p) return; // already resolved by the token callback
          pending = null;
          p.reject(new Error('Sign-in popup was closed before access was granted.'));
        }, 3000);
        return;
      }
      pending = null;
      p.reject(new Error(err.message || err.type));
    },
  });
}

/** Opens the Google consent popup (must be triggered by a user gesture). */
export function signIn(): Promise<Session> {
  if (!tokenClient) return Promise.reject(new Error('Auth not initialised'));
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient!.requestAccessToken();
  });
}

interface RevokeResult {
  successful?: boolean;
  error?: string;
  error_description?: string;
}

function revokeWithGis(token: string): Promise<RevokeResult | undefined> {
  return new Promise((resolve) => {
    // GIS passes a RevocationResponse to the callback at runtime, although the typings declare `() => void`.
    const done = (resp?: RevokeResult) => resolve(resp);
    (google.accounts.oauth2.revoke as (t: string, cb: (r?: RevokeResult) => void) => void)(token, done);
  });
}

async function revokeWithEndpoint(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Revokes the grant with Google (removes the app's access from the user's account).
 * Resolves to true if Google confirmed the revocation.
 */
export async function signOut(session: Session | null): Promise<boolean> {
  if (!session) return true;
  const resp = await revokeWithGis(session.accessToken);
  if (resp?.successful) return true;
  console.warn('GIS token revocation failed, retrying via revoke endpoint', resp);
  const ok = await revokeWithEndpoint(session.accessToken);
  if (!ok) console.warn('Token revocation via revoke endpoint failed');
  return ok;
}
