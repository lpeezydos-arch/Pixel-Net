import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';

interface InfoTipProps {
  /** Accessible name of the button, such as "About slope". */
  label: string;
  /** The tooltip: one sentence. */
  text: string;
  className?: string;
}

/**
 * An `i` button with a one-sentence tooltip. It opens on hover (after the
 * provider's delay) and on keyboard focus, and a tap toggles it on touch.
 */
export function InfoTip({ label, text, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tap = useRef({ touch: false, wasOpen: false });

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={className ? `info-dot ${className}` : 'info-dot'}
          aria-label={label}
          onPointerDown={(event) => {
            tap.current = { touch: event.pointerType === 'touch', wasOpen: open };
          }}
          onClick={(event) => {
            if (!tap.current.touch) return;
            // Radix closes a tooltip on click. On touch, toggle it.
            event.preventDefault();
            setOpen(!tap.current.wasOpen);
          }}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6} collisionPadding={8}>
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
