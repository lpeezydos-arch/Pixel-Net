import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { howToLines } from '../help/howTo';
import { type NewsEntry, formatDate, isUnseen } from '../help/news';

interface HelpSheetProps {
  /** The entries to show, newest first. */
  entries: NewsEntry[];
  /** The newest entry the device had shown before this opening. Later ones are marked new. */
  seen: number;
  /** True on a touch screen, which is told about taps rather than clicks and keys. */
  coarse: boolean;
  /** Called as the sheet closes, just before it gives focus back to the button. */
  onReturnFocus: () => void;
}

/**
 * How to use the app, and what has changed in it. It goes inside a
 * `Dialog.Root`, which holds whether it is open. It is shown only when asked
 * for, and it never scrolls: three entries are all it has room for.
 */
export function HelpSheet({ entries, seen, coarse, onReturnFocus }: HelpSheetProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="scrim" />
      <Dialog.Content
        className="sheet"
        data-testid="help-sheet"
        // The two headings say what is here; there is no one description.
        aria-describedby={undefined}
        onCloseAutoFocus={onReturnFocus}
      >
        <Dialog.Title className="visually-hidden">Help</Dialog.Title>
        <Dialog.Close asChild>
          <button type="button" className="icon-btn sheet__close" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </Dialog.Close>
        <div className="sheet__parts">
          <section className="sheet__part" aria-labelledby="help-how-heading">
            <h2 id="help-how-heading" className="sheet__heading">
              How to use it
            </h2>
            {/* role="list": Safari VoiceOver drops list semantics when list-style is none. */}
            <ul className="sheet__list" role="list" data-testid="help-how">
              {howToLines(coarse).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          {entries.length > 0 && (
            <section className="sheet__part" aria-labelledby="help-news-heading">
              <h2 id="help-news-heading" className="sheet__heading">
                {"What's new"}
              </h2>
              {/* role="list": Safari VoiceOver drops list semantics when list-style is none. */}
              <ul className="sheet__list" role="list" data-testid="help-news">
                {entries.map((entry) => {
                  const unseen = isUnseen(entry, seen);
                  return (
                    <li key={entry.id} className="news" data-new={unseen}>
                      <span className="news__dot" aria-hidden="true" />
                      <time className="news__date" dateTime={entry.date}>
                        {formatDate(entry.date)}
                      </time>
                      <span>
                        {unseen && <span className="visually-hidden">New. </span>}
                        {entry.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
