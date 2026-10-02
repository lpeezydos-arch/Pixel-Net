import type { DemEntry } from '../state/useDems';

interface TitleBarProps {
  entries: DemEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function TitleBar({ entries, activeId, onSelect }: TitleBarProps) {
  return (
    <header className="titlebar">
      <h1 className="titlebar__name">{import.meta.env.VITE_APP_NAME}</h1>
      {entries.length > 1 ? (
        <div className="segmented" role="tablist" aria-label="DEM">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              className="segmented__seg"
              aria-selected={entry.id === activeId}
              onClick={() => onSelect(entry.id)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      ) : entries.length === 1 ? (
        <span className="titlebar__dem">{entries[0].name}</span>
      ) : null}
    </header>
  );
}
