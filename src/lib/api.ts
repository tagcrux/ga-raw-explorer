import type {
  AccountSummary,
  CompatibilityResponse,
  PropertyMetadata,
  RunReportRequest,
  RunReportResponse,
} from './types';

const ADMIN = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA = 'https://analyticsdata.googleapis.com/v1beta';

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, body?.error);
  }
  return body as T;
}

/** All accounts and their GA4 properties the signed-in user can access. */
export async function listAccountSummaries(token: string): Promise<AccountSummary[]> {
  const all: AccountSummary[] = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '200' });
    if (pageToken) qs.set('pageToken', pageToken);
    const page = await request<{ accountSummaries?: AccountSummary[]; nextPageToken?: string }>(
      token,
      `${ADMIN}/accountSummaries?${qs}`,
    );
    all.push(...(page.accountSummaries ?? []));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return all;
}

/** Dimensions & metrics available for a property (including custom definitions). */
export async function getMetadata(token: string, property: string): Promise<PropertyMetadata> {
  const res = await request<Partial<PropertyMetadata>>(token, `${DATA}/${property}/metadata`);
  return { dimensions: res.dimensions ?? [], metrics: res.metrics ?? [] };
}

export function checkCompatibility(
  token: string,
  property: string,
  dimensions: string[],
  metrics: string[],
): Promise<CompatibilityResponse> {
  return request<CompatibilityResponse>(token, `${DATA}/${property}:checkCompatibility`, {
    method: 'POST',
    body: JSON.stringify({
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
    }),
  });
}

export function runReport(token: string, property: string, body: RunReportRequest): Promise<RunReportResponse> {
  return request<RunReportResponse>(token, `${DATA}/${property}:runReport`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getUserEmail(token: string): Promise<string | null> {
  try {
    const info = await request<{ email?: string }>(token, 'https://www.googleapis.com/oauth2/v3/userinfo');
    return info.email ?? null;
  } catch {
    return null;
  }
}
