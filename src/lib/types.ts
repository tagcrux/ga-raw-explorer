// Minimal typings for the parts of the GA4 Admin & Data APIs this app uses.

export interface PropertySummary {
  property: string; // "properties/123"
  displayName: string;
  propertyType?: string;
  parent?: string;
}

export interface AccountSummary {
  name: string; // "accountSummaries/123"
  account: string; // "accounts/123"
  displayName: string;
  propertySummaries?: PropertySummary[];
}

export interface DimensionMetadata {
  apiName: string;
  uiName: string;
  description?: string;
  category?: string;
  customDefinition?: boolean;
}

export interface MetricMetadata extends DimensionMetadata {
  type?: string; // TYPE_INTEGER, TYPE_FLOAT, TYPE_CURRENCY, ...
}

export interface PropertyMetadata {
  dimensions: DimensionMetadata[];
  metrics: MetricMetadata[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface OrderBy {
  desc?: boolean;
  dimension?: { dimensionName: string };
  metric?: { metricName: string };
}

export interface RunReportRequest {
  dateRanges: DateRange[];
  dimensions: { name: string }[];
  metrics: { name: string }[];
  limit: number;
  offset: number;
  orderBys?: OrderBy[];
  keepEmptyRows?: boolean;
  returnPropertyQuota?: boolean;
}

export interface QuotaStatus {
  consumed?: number;
  remaining?: number;
}

export interface RunReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string; type?: string }[];
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
  rowCount?: number;
  metadata?: { currencyCode?: string; timeZone?: string; dataLossFromOtherRow?: boolean };
  propertyQuota?: {
    tokensPerDay?: QuotaStatus;
    tokensPerHour?: QuotaStatus;
    concurrentRequests?: QuotaStatus;
  };
}

export interface CompatibilityResponse {
  dimensionCompatibilities?: { dimensionMetadata?: { apiName: string }; compatibility?: string }[];
  metricCompatibilities?: { metricMetadata?: { apiName: string }; compatibility?: string }[];
}
