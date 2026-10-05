import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type CSSProperties, useRef } from 'react';
import type { DemEntry } from '../state/useDems';
import { tileLine } from '../terrain/format';

const DEM_FOLDER = `${import.meta.env.BASE_URL}dems/`;

interface DemSheetProps {
  entries: DemEntry[];
  activeId: string | null;
  /** A tile was pressed, the current DEM's included. */
  onChoose: (id: string) => void;
}

/**
 * The DEMs to choose from, one tile each. It goes inside a `Dialog.Root`,
 * which holds whether it is open. Like the help sheet it never scrolls: four
 * tiles are all the list can hold.
 */
export function DemSheet({ entries, activeId, onChoose }: DemSheetProps) {
  const current = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="scrim" />
      <Dialog.Content
        className="sheet sheet--dems"
        data-testid="dem-sheet"
        // The heading says what is here; there is no description.
        aria-describedby={undefined}
        // Focus starts on the DEM that is shown, not on the close button.
        onOpenAutoFocus={(event) => {
          if (!current.current) return;
          event.preventDefault();
          current.current.focus();
        }}
      >
        <Dialog.Title className="sheet__heading">DEM</Dialog.Title>
        <Dialog.Close asChild>
          <button type="button" className="icon-btn sheet__close" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </Dialog.Close>
        {/* role="list": Safari VoiceOver drops list semantics when list-style is none. */}
        <ul className="dem-tiles" role="list" style={{ '--tiles': entries.length } as CSSProperties}>
          {entries.map((entry) => {
            const isCurrent = entry.id === activeId;
            const line = tileLine(entry);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="dem-tile"
                  ref={isCurrent ? current : undefined}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => onChoose(entry.id)}
                >
                  <span className="dem-tile__picture">
                    <img
                      src={`${DEM_FOLDER}${entry.id}.png`}
                      alt=""
                      draggable={false}
                      decoding="async"
                      // A DEM with no thumbnail keeps its plain square.
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  </span>
                  <span className="dem-tile__name">{entry.name}</span>
                  {line && <span className="dem-tile__line">{line}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
