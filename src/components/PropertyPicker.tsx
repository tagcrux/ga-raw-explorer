import { useMemo, useState } from 'react';
import type { AccountSummary } from '../lib/types';

interface Props {
  accounts: AccountSummary[];
  selected: string | null;
  onSelect: (property: string) => void;
}

export function PropertyPicker({ accounts, selected, onSelect }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return accounts
      .map((a) => ({
        ...a,
        propertySummaries: (a.propertySummaries ?? []).filter(
          (p) =>
            !needle ||
            p.displayName.toLowerCase().includes(needle) ||
            p.property.includes(needle) ||
            a.displayName.toLowerCase().includes(needle),
        ),
      }))
      .filter((a) => a.propertySummaries.length > 0);
  }, [accounts, q]);

  if (accounts.length === 0) {
    return <p className="muted">No Google Analytics 4 accounts found for this Google account.</p>;
  }

  return (
    <div className="picker">
      <input
        className="search"
        placeholder="Search account / property / ID"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="picker-list">
        {filtered.map((a) => (
          <div key={a.account} className="picker-group">
            <div className="picker-group-title" title={a.account}>
              {a.displayName}
            </div>
            {a.propertySummaries.map((p) => (
              <button
                key={p.property}
                className={`picker-item ${selected === p.property ? 'active' : ''}`}
                onClick={() => onSelect(p.property)}
              >
                <span>{p.displayName}</span>
                <code>{p.property.replace('properties/', '')}</code>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
