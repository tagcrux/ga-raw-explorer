function escape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}

export function download(filename: string, content: string, mime: string): void {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + content : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
