import type { ShareOutcome } from '../share/share';
import type { DemEntry } from '../state/useDems';
import { ShareButton } from './ShareButton';
import { HelpButton } from './HelpButton';

interface TitleBarProps {
  entries: DemEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** True until a DEM is ready to be shared. */
  shareDisabled: boolean;
  /** Shares the view. It is called inside the press on the share button. */
  onShare: () => Promise<ShareOutcome>;
}

export function TitleBar({ entries, activeId, onSelect, shareDisabled, onShare }: TitleBarProps) {
  return (
    <header className="titlebar">
      <h1 className="titlebar__name">{import.meta.env.VITE_APP_NAME}</h1>
      <div className="titlebar__end">
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
        <ShareButton disabled={shareDisabled} onShare={onShare} />
        <HelpButton />
      </div>
    </header>
  );
}
