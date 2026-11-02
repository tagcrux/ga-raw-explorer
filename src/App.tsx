import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initAuth, signIn, signOut, type Session } from './lib/auth';
import { ApiError, checkCompatibility, getMetadata, getUserEmail, listAccountSummaries, runReport } from './lib/api';
import type { AccountSummary, PropertyMetadata, RunReportRequest, RunReportResponse } from './lib/types';
import { PRESETS, daysAgo } from './lib/dates';
import { PropertyPicker } from './components/PropertyPicker';
import { FieldPicker } from './components/FieldPicker';
import { ResultTable } from './components/ResultTable';
import { Landing } from './components/Landing';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const MAX_DIMENSIONS = 9;
const MAX_METRICS = 10;
const REPO_URL = 'https://github.com/tag-crux/ga-raw-explorer';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [property, setProperty] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PropertyMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [dims, setDims] = useState<string[]>([]);
  const [mets, setMets] = useState<string[]>([]);
  const [incompatible, setIncompatible] = useState<Set<string>>(new Set());

  const [startDate, setStartDate] = useState(daysAgo(28));
  const [endDate, setEndDate] = useState(daysAgo(1));
  const [limit, setLimit] = useState(1000);
  const [offset, setOffset] = useState(0);

  const [running, setRunning] = useState(false);
  const [lastRequest, setLastRequest] = useState<RunReportRequest | null>(null);
  const [response, setResponse] = useState<RunReportResponse | null>(null);
  const [tab, setTab] = useState<'table' | 'raw'>('table');

  const token = session?.accessToken ?? null;

  // ---- auth ---------------------------------------------------------------
  useEffect(() => {
    if (!CLIENT_ID) return;
    initAuth(CLIENT_ID).then(() => setAuthReady(true), (e: Error) => setError(e.message));
  }, []);

  const resetAll = () => {
    setSession(null);
    setEmail(null);
    setAccounts(null);
    setProperty(null);
    setMetadata(null);
    setDims([]);
    setMets([]);
    setResponse(null);
    setLastRequest(null);
  };

  const handleApiError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      resetAll();
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const login = async () => {
    setError(null);
    try {
      const s = await signIn();
      setSession(s);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const logout = async () => {
    await signOut(session);
    resetAll();
  };

  // auto-expire in-memory token
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => {
      resetAll();
      setError('Your session has expired. Please sign in again.');
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [session]);

  // ---- data loading -------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    getUserEmail(token).then(setEmail);
    listAccountSummaries(token).then(setAccounts, handleApiError);
  }, [token, handleApiError]);

  useEffect(() => {
    if (!token || !property) return;
    setLoadingMeta(true);
    setMetadata(null);
    setDims([]);
    setMets([]);
    setResponse(null);
    setLastRequest(null);
    getMetadata(token, property)
      .then(setMetadata, handleApiError)
      .finally(() => setLoadingMeta(false));
  }, [token, property, handleApiError]);

  // compatibility check (debounced)
  const compatSeq = useRef(0);
  useEffect(() => {
    if (!token || !property || (dims.length === 0 && mets.length === 0)) {
      setIncompatible(new Set());
      return;
    }
    const seq = ++compatSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await checkCompatibility(token, property, dims, mets);
        if (seq !== compatSeq.current) return;
        const bad = new Set<string>();
        res.dimensionCompatibilities?.forEach((c) => {
          if (c.compatibility === 'INCOMPATIBLE' && c.dimensionMetadata) bad.add(c.dimensionMetadata.apiName);
        });
        res.metricCompatibilities?.forEach((c) => {
          if (c.compatibility === 'INCOMPATIBLE' && c.metricMetadata) bad.add(c.metricMetadata.apiName);
        });
        setIncompatible(bad);
      } catch {
        /* compatibility is a hint only */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [token, property, dims, mets]);

  const run = async (newOffset = 0) => {
    if (!token || !property) return;
    const body: RunReportRequest = {
      dateRanges: [{ startDate, endDate }],
      dimensions: dims.map((name) => ({ name })),
      metrics: mets.map((name) => ({ name })),
      limit,
      offset: newOffset,
      returnPropertyQuota: true,
    };
    setRunning(true);
    setError(null);
    setOffset(newOffset);
    setLastRequest(body);
    try {
      setResponse(await runReport(token, property, body));
    } catch (e) {
      handleApiError(e);
    } finally {
      setRunning(false);
    }
  };

  const propertyName = useMemo(() => {
    for (const a of accounts ?? []) {
      const p = a.propertySummaries?.find((x) => x.property === property);
      if (p) return `${a.displayName} › ${p.displayName}`;
    }
    return property ?? '';
  }, [accounts, property]);

  const selectedHasIncompatible = [...dims, ...mets].some((f) => incompatible.has(f));
  const canRun = !!property && mets.length > 0 && !running;
  const rowCount = response?.rowCount ?? 0;

  // ---- render -------------------------------------------------------------
  if (!CLIENT_ID) {
    return (
      <div className="center-screen">
        <div className="card">
          <h1>GA Raw Explorer</h1>
          <p>
            <code>VITE_GOOGLE_CLIENT_ID</code> is not set. Copy <code>.env.example</code> to <code>.env.local</code>, add your
            OAuth Client ID and rebuild. See the README for details.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Landing authReady={authReady} error={error} onSignIn={login} repoUrl={REPO_URL} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <strong>GA Raw Explorer</strong>
        <span className="muted small">{propertyName}</span>
        <div className="spacer" />
        {email && <span className="small">{email}</span>}
        <a className="small" href="./privacy.html" target="_blank" rel="noreferrer">
          Privacy
        </a>
        <button onClick={logout}>Sign out</button>
      </header>

      {error && (
        <div className="error-bar">
          {error} <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <h3>Properties</h3>
          {accounts ? (
            <PropertyPicker accounts={accounts} selected={property} onSelect={setProperty} />
          ) : (
            <p className="muted">Loading accounts…</p>
          )}
        </aside>

        <main className="main">
          {!property && <p className="muted center">Select a property on the left to start.</p>}
          {property && loadingMeta && <p className="muted center">Loading dimensions & metrics…</p>}

          {property && metadata && (
            <>
              <section className="fields">
                <FieldPicker
                  title="Dimensions"
                  fields={metadata.dimensions}
                  selected={dims}
                  max={MAX_DIMENSIONS}
                  incompatible={incompatible}
                  onChange={setDims}
                />
                <FieldPicker
                  title="Metrics"
                  fields={metadata.metrics}
                  selected={mets}
                  max={MAX_METRICS}
                  incompatible={incompatible}
                  onChange={setMets}
                />
              </section>

              <section className="querybar">
                <div className="presets">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className="small"
                      onClick={() => {
                        setStartDate(p.start());
                        setEndDate(p.end());
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <label>
                  From <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label>
                  To <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <label>
                  Rows per page
                  <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    {[100, 1000, 10000, 100000].map((n) => (
                      <option key={n} value={n}>
                        {n.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="spacer" />
                {selectedHasIncompatible && <span className="warn small">Incompatible selection</span>}
                <button className="primary" disabled={!canRun} onClick={() => run(0)}>
                  {running ? 'Running…' : 'Run report'}
                </button>
              </section>
              {mets.length === 0 && <p className="muted small">Select at least one metric.</p>}

              {response && (
                <section className="results">
                  <div className="tabs">
                    <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
                      Table
                    </button>
                    <button className={tab === 'raw' ? 'active' : ''} onClick={() => setTab('raw')}>
                      Raw JSON
                    </button>
                    <div className="spacer" />
                    <span className="muted small">
                      Total rows: {rowCount.toLocaleString()}
                      {response.metadata?.timeZone && ` · ${response.metadata.timeZone}`}
                      {response.metadata?.currencyCode && ` · ${response.metadata.currencyCode}`}
                      {response.propertyQuota?.tokensPerDay?.remaining !== undefined &&
                        ` · Daily quota left: ${response.propertyQuota.tokensPerDay.remaining.toLocaleString()}`}
                    </span>
                  </div>

                  {tab === 'table' ? (
                    <ResultTable response={response} fileBase={`ga4-${property.replace('properties/', '')}-${startDate}_${endDate}`} />
                  ) : (
                    <div className="raw">
                      <h4>Request</h4>
                      <pre>{JSON.stringify(lastRequest, null, 2)}</pre>
                      <h4>Response</h4>
                      <pre>{JSON.stringify(response, null, 2)}</pre>
                    </div>
                  )}

                  {rowCount > limit && (
                    <div className="pager">
                      <button disabled={offset === 0 || running} onClick={() => run(Math.max(0, offset - limit))}>
                        ‹ Prev
                      </button>
                      <span className="small">
                        Rows {(offset + 1).toLocaleString()}–{Math.min(offset + limit, rowCount).toLocaleString()} of{' '}
                        {rowCount.toLocaleString()}
                      </span>
                      <button disabled={offset + limit >= rowCount || running} onClick={() => run(offset + limit)}>
                        Next ›
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
