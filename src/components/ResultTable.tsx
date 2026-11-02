import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { RunReportResponse } from '../lib/types';
import { download, toCsv } from '../lib/csv';

interface Props {
  response: RunReportResponse;
  fileBase: string;
}

const DEFAULT_MAX = 320; // px; long values are truncated until the column is resized
const MIN_WIDTH = 48;

// Column widths live in CSS variables on the <table ref={tableRef} className={wrap ? 'wrap' : ''}>, so dragging a resizer
// updates the layout without re-rendering every row.
const colStyle = (i: number): CSSProperties => ({
  width: `var(--w${i}, auto)`,
  minWidth: `var(--w${i}, ${MIN_WIDTH}px)`,
  maxWidth: `var(--w${i}, ${DEFAULT_MAX}px)`,
});

const NUMERIC = /^TYPE_(INTEGER|FLOAT|SECONDS|MILLISECONDS|MINUTES|HOURS|STANDARD|CURRENCY|FEET|MILES|METERS|KILOMETERS)$/;

export function ResultTable({ response, fileBase }: Props) {
  const [sort, setSort] = useState<{ col: number; desc: boolean } | null>(null);
  const [filter, setFilter] = useState('');
  const [wrap, setWrap] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const dimHeaders = response.dimensionHeaders ?? [];
  const metHeaders = response.metricHeaders ?? [];
  const headers = [...dimHeaders.map((h) => h.name), ...metHeaders.map((h) => h.name)];
  const numericCols = new Set(metHeaders.map((h, i) => (NUMERIC.test(h.type ?? '') ? dimHeaders.length + i : -1)));

  const rows = useMemo(
    () =>
      (response.rows ?? []).map((r) => [
        ...(r.dimensionValues ?? []).map((v) => v.value ?? ''),
        ...(r.metricValues ?? []).map((v) => v.value ?? ''),
      ]),
    [response],
  );

  const view = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    let out = needle ? rows.filter((r) => r.some((c) => c.toLowerCase().includes(needle))) : rows;
    if (sort) {
      const { col, desc } = sort;
      const num = numericCols.has(col);
      out = [...out].sort((a, b) => {
        const cmp = num ? Number(a[col]) - Number(b[col]) : a[col].localeCompare(b[col], undefined, { numeric: true });
        return desc ? -cmp : cmp;
      });
    }
    return out;
  }, [rows, filter, sort]);

  const styles = useMemo(() => headers.map((_, i) => colStyle(i)), [headers.length]);

  // new report → forget manual column widths
  useEffect(() => {
    tableRef.current?.removeAttribute('style');
  }, [response]);

  const startResize = (col: number) => (e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.parentElement as HTMLElement;
    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => {
      const w = Math.max(MIN_WIDTH, Math.round(startW + ev.clientX - startX));
      tableRef.current?.style.setProperty(`--w${col}`, `${w}px`);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  };

  const resetWidth = (col: number) => tableRef.current?.style.removeProperty(`--w${col}`);

  const clickHeader = (col: number) =>
    setSort((s) => (s?.col === col ? (s.desc ? { col, desc: false } : null) : { col, desc: numericCols.has(col) }));

  return (
    <div className="result">
      <div className="result-toolbar">
        <input className="search" placeholder="Filter rows (client-side)" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="muted small">
          Showing {view.length.toLocaleString()} of {rows.length.toLocaleString()} loaded rows
        </span>
        <div className="spacer" />
        <label className="small">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap long values
        </label>
        <button onClick={() => download(`${fileBase}.csv`, toCsv(headers, view), 'text/csv;charset=utf-8')}>Export CSV</button>
        <button onClick={() => download(`${fileBase}.json`, JSON.stringify(response, null, 2), 'application/json')}>
          Export JSON
        </button>
      </div>
      <div className="table-wrap">
        <table ref={tableRef} className={wrap ? 'wrap' : ''}>
          <thead>
            <tr>
              <th className="rownum">#</th>
              {headers.map((h, i) => (
                <th
                  key={h}
                  style={styles[i]}
                  onClick={() => clickHeader(i)}
                  className={`${i < dimHeaders.length ? 'dim' : 'met'} ${numericCols.has(i) ? 'num' : ''}`}
                  title={i < dimHeaders.length ? 'Dimension' : `Metric (${metHeaders[i - dimHeaders.length]?.type})`}
                >
                  <span className="th-label">
                    {h}
                    {sort?.col === i ? (sort.desc ? ' ▼' : ' ▲') : ''}
                  </span>
                  <span
                    className="resizer"
                    title="Drag to resize · double-click to reset"
                    onPointerDown={startResize(i)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      resetWidth(i);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, ri) => (
              <tr key={ri}>
                <td className="rownum">{ri + 1}</td>
                {r.map((c, ci) => (
                  <td key={ci} className={numericCols.has(ci) ? 'num' : ''} style={styles[ci]} title={c}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted center">The query returned no rows.</p>}
      </div>
    </div>
  );
}
