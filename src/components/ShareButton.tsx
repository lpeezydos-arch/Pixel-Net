import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, Share } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ShareOutcome } from '../share/share';
import { announce } from './announce';

const LABEL = 'Share this view';
const COPIED = 'Link copied';
const REFUSED = 'Could not copy the link';
const NOTICE_MS = 1600; // how long the outcome stays beside the button

interface ShareButtonProps {
  /** True until a DEM is ready to be shared. */
  disabled: boolean;
  /** Shares the view. It is called inside the press, as browsers require. */
  onShare: () => Promise<ShareOutcome>;
}

/**
 * The one share button. A share sheet reports its own outcome, so the button
 * says something only when the link was copied instead, or could not be: the
 * tooltip carries the words for a moment, and a live region speaks them.
 */
export function ShareButton({ disabled, onShare }: ShareButtonProps) {
  const [tipOpen, setTipOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const announceRef = useRef<HTMLSpanElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A share sheet is open. A second press must not start another share.
  const busy = useRef(false);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const onClick = async () => {
    if (busy.current) return;
    busy.current = true;
    let outcome: ShareOutcome;
    try {
      outcome = await onShare();
    } finally {
      busy.current = false;
    }
    if (outcome !== 'copied' && outcome !== 'failed') return;
    const words = outcome === 'copied' ? COPIED : REFUSED;
    setNotice(words);
    announce(announceRef.current, words);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const copied = notice === COPIED;
  return (
    <>
      {/* The outcome holds the tooltip open, whether or not the pointer is there. */}
      <Tooltip.Root open={notice !== null || tipOpen} onOpenChange={setTipOpen}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="icon-btn"
            aria-label={LABEL}
            data-testid="share"
            data-done={copied}
            disabled={disabled}
            onClick={onClick}
          >
            {copied ? <Check size={20} aria-hidden="true" /> : <Share size={20} aria-hidden="true" />}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
            {notice ?? LABEL}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <span
        ref={announceRef}
        className="visually-hidden"
        aria-live="polite"
        data-testid="share-announcement"
      />
    </>
  );
}
