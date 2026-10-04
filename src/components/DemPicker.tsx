import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { DemEntry } from '../state/useDems';
import { DemSheet } from './DemSheet';

interface DemPickerProps {
  entries: DemEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The picker: the DEM's name as a button, and the sheet of DEMs it opens.
 * The button stays usable while a DEM loads and when one fails, so there is
 * always a way to another DEM.
 */
export function DemPicker({ entries, activeId, onSelect }: DemPickerProps) {
  const [open, setOpen] = useState(false);
  const name = entries.find((entry) => entry.id === activeId)?.name ?? '';

  const choose = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="dem-btn" aria-label={`DEM: ${name}`} data-testid="dem-button">
          <span className="dem-btn__name">{name}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <DemSheet entries={entries} activeId={activeId} onChoose={choose} />
    </Dialog.Root>
  );
}
