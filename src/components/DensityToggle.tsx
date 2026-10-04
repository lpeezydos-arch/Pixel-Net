import * as Tooltip from '@radix-ui/react-tooltip';
import { Layers } from 'lucide-react';

const LABEL = 'Density';

interface DensityToggleProps {
  /** Whether the density layer is on. */
  on: boolean;
  onChange: (on: boolean) => void;
}

/**
 * Turns the density layer on and off. Unlike the `i` in the opposite corner
 * it is a control, so it is a stop for Tab and says whether it is pressed.
 */
export function DensityToggle({ on, onChange }: DensityToggleProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="net__toggle"
          aria-label={LABEL}
          aria-pressed={on}
          data-testid="density-toggle"
          onClick={() => onChange(!on)}
        >
          <Layers size={16} aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
          {LABEL}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
