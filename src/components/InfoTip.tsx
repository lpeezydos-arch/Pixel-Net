import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';

interface InfoTipProps {
  /** Accessible name of the button, such as "How to read the net". */
  label: string;
  /** The tooltip. */
  text: string;
  /** Which side of the button the tooltip opens on. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * An `i` button with a tooltip. It opens on hover (after the provider's
 * delay), and a tap toggles it on touch. It is help, not a control: it is
 * left out of the Tab order, and what it says is also given to assistive
 * technology as the description of the thing it explains.
 */
export function InfoTip({ label, text, side, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tap = useRef({ touch: false, wasOpen: false });

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={className ? `info-dot ${className}` : 'info-dot'}
          aria-label={label}
          tabIndex={-1}
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
        <Tooltip.Content className="tooltip" side={side} sideOffset={6} collisionPadding={8}>
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
