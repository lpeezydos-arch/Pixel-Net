import type { ShareOutcome } from '../share/share';
import type { DemEntry } from '../state/useDems';
import { DemPicker } from './DemPicker';
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
          <DemPicker entries={entries} activeId={activeId} onSelect={onSelect} />
        ) : entries.length === 1 ? (
          <span className="titlebar__dem">{entries[0].name}</span>
        ) : null}
        <ShareButton disabled={shareDisabled} onShare={onShare} />
        <HelpButton />
      </div>
    </header>
  );
}
