export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export const PRESETS: { label: string; start: () => string; end: () => string }[] = [
  { label: 'Today', start: () => daysAgo(0), end: () => daysAgo(0) },
  { label: 'Yesterday', start: () => daysAgo(1), end: () => daysAgo(1) },
  { label: 'Last 7 days', start: () => daysAgo(7), end: () => daysAgo(1) },
  { label: 'Last 28 days', start: () => daysAgo(28), end: () => daysAgo(1) },
  { label: 'Last 90 days', start: () => daysAgo(90), end: () => daysAgo(1) },
];
