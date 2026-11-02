import { useMemo, useState } from 'react';
import type { DimensionMetadata } from '../lib/types';

interface Props {
  title: string;
  fields: DimensionMetadata[];
  selected: string[];
  max: number;
  incompatible: Set<string>;
  onChange: (next: string[]) => void;
}

export function FieldPicker({ title, fields, selected, max, incompatible, onChange }: Props) {
  const [q, setQ] = useState('');
  const [compatibleOnly, setCompatibleOnly] = useState(false);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, DimensionMetadata[]>();
    for (const f of fields) {
      if (compatibleOnly && incompatible.has(f.apiName) && !selected.includes(f.apiName)) continue;
      if (needle && !f.apiName.toLowerCase().includes(needle) && !f.uiName.toLowerCase().includes(needle)) continue;
      const cat = f.customDefinition ? 'Custom' : f.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [fields, q, compatibleOnly, incompatible, selected]);

  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else if (selected.length < max) onChange([...selected, name]);
  };

  return (
    <div className="field-picker">
      <div className="field-picker-head">
        <h3>
          {title} <span className="muted">({selected.length}/{max})</span>
        </h3>
        <label className="small">
          <input type="checkbox" checked={compatibleOnly} onChange={(e) => setCompatibleOnly(e.target.checked)} />{' '}
          compatible only
        </label>
      </div>

      {selected.length > 0 && (
        <div className="chips">
          {selected.map((s) => (
            <button key={s} className={`chip ${incompatible.has(s) ? 'bad' : ''}`} onClick={() => toggle(s)} title="Remove">
              {s} ×
            </button>
          ))}
        </div>
      )}

      <input className="search" placeholder={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="field-list">
        {groups.map(([cat, items]) => (
          <details key={cat} open={!!q}>
            <summary>
              {cat} <span className="muted">({items.length})</span>
            </summary>
            {items.map((f) => {
              const checked = selected.includes(f.apiName);
              const bad = incompatible.has(f.apiName);
              return (
                <label key={f.apiName} className={`field ${bad ? 'incompatible' : ''}`} title={f.description}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selected.length >= max}
                    onChange={() => toggle(f.apiName)}
                  />
                  <span className="field-ui">{f.uiName}</span>
                  <code>{f.apiName}</code>
                </label>
              );
            })}
          </details>
        ))}
        {groups.length === 0 && <p className="muted small">No matches.</p>}
      </div>
    </div>
  );
}
