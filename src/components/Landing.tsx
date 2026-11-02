interface Props {
  authReady: boolean;
  error: string | null;
  onSignIn: () => void;
  repoUrl: string;
}

// Google "G" mark for the sign-in button (Google sign-in branding guidelines)
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function Landing({ authReady, error, onSignIn, repoUrl }: Props) {
  return (
    <div className="landing">
      <section className="hero">
        <img src="./favicon.svg" width={64} height={64} alt="" />
        <h1>GA Raw Explorer</h1>
        <p className="lead">
          Explore raw Google Analytics 4 data from every account and property you have access to, as a plain table,
          right in your browser.
        </p>
        <button className="google-btn" disabled={!authReady} onClick={onSignIn}>
          <GoogleG />
          <span>{authReady ? 'Sign in with Google' : 'Loading…'}</span>
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="features">
        <div>
          <h3>Pick any property</h3>
          <p>All GA4 accounts and properties of your Google account in one searchable list.</p>
        </div>
        <div>
          <h3>Any dimension &amp; metric</h3>
          <p>Including custom definitions, with a live compatibility check before you run the report.</p>
        </div>
        <div>
          <h3>Raw table &amp; export</h3>
          <p>Sort, filter, resize columns, page through results and export to CSV or JSON.</p>
        </div>
      </section>

      <section className="data-use">
        <h2>How GA Raw Explorer uses your Google data</h2>
        <ul>
          <li>
            The app asks for <strong>read-only</strong> access to Google Analytics
            (<code>analytics.readonly</code>) and your email address. It cannot change anything in your accounts.
          </li>
          <li>
            Your browser talks <strong>directly to Google's APIs</strong>. There is no backend server and no database;
            nothing is sent to us or to third parties.
          </li>
          <li>
            Report data is shown only in your browser tab and is <strong>never stored</strong>. The access token is
            kept in memory and revoked when you sign out.
          </li>
          <li>
            Use of information received from Google APIs adheres to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </li>
        </ul>
      </section>

      <footer className="landing-footer">
        <a href="./privacy.html">Privacy Policy</a>
        <a href="./terms.html">Terms of Service</a>
        <a href={repoUrl} target="_blank" rel="noreferrer">
          Source code
        </a>
        <span className="muted">© 2026 tagcrux · MIT License</span>
      </footer>
    </div>
  );
}
