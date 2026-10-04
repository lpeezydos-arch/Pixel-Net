import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CircleQuestionMark } from 'lucide-react';
import { useRef, useState } from 'react';
import { NEWS, latest, newestId } from '../help/news';
import { readSeen, writeSeen } from '../help/newsStore';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { HelpSheet } from './HelpSheet';

const LABEL = "Help and what's new";
const SHOWN = 3; // how many entries the sheet has room for without scrolling
const NEWEST = newestId(NEWS);

/**
 * The help button and its sheet. Nothing opens unasked: a dot on the button
 * is the only sign that there is news this device has not shown, and opening
 * the sheet clears it.
 */
export function HelpButton() {
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  // The newest entry this device has shown, and what that was when the sheet
  // last opened: the sheet marks the entries that were new at that moment.
  const [seen, setSeen] = useState(readSeen);
  const [seenAtOpen, setSeenAtOpen] = useState(seen);
  // True while the closing sheet hands focus back to the button.
  const returning = useRef(false);

  const hasNews = NEWEST > seen;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // A tooltip that was open under the pointer must not wait behind the sheet
    // and show the moment it closes.
    setTipOpen(false);
    // Another tab may have shown the news since this one read it. The higher
    // value wins; with storage closed the read is 0 and the state still counts.
    const current = Math.max(seen, readSeen());
    setSeenAtOpen(current);
    // A remembered value above the newest entry is left as it is.
    if (NEWEST > current) {
      setSeen(NEWEST);
      writeSeen(NEWEST);
    } else {
      setSeen(current);
    }
  };

  // Focus opens a tooltip. The focus the sheet hands back was not asked for,
  // and on a touch screen the tooltip it opened would stay until the next tap.
  const onTipOpenChange = (next: boolean) => {
    if (next && returning.current) {
      returning.current = false;
      return;
    }
    setTipOpen(next);
  };

  const onReturnFocus = () => {
    returning.current = true;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip.Root open={tipOpen && !open} onOpenChange={onTipOpenChange}>
        <Tooltip.Trigger asChild>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="icon-btn help-btn"
              aria-label={hasNews ? `${LABEL}, new changes` : LABEL}
              data-testid="help"
              // Once focus leaves, a later focus or hover is the person's own.
              onBlur={() => {
                returning.current = false;
              }}
            >
              <CircleQuestionMark size={20} aria-hidden="true" />
              {hasNews && <span className="help-btn__dot" data-testid="help-dot" />}
            </button>
          </Dialog.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
            {LABEL}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <HelpSheet entries={latest(NEWS, SHOWN)} seen={seenAtOpen} coarse={coarse} onReturnFocus={onReturnFocus} />
    </Dialog.Root>
  );
}
