export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

/** What goes with a share: the app's name, one line of text and the link. */
export interface ShareWords {
  title: string;
  text: string;
  url: string;
}

/** True where there is a share sheet that can say whether it takes files. */
export function canShareFiles(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}

async function copy(url: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * Hands the view to the share sheet, with the picture if the sheet takes
 * files. Where there is no share sheet, or it fails, the link is copied.
 * Call this inside a press: browsers refuse a share that starts later.
 */
export async function shareView(words: ShareWords, file: File | null): Promise<ShareOutcome> {
  if (typeof navigator.share !== 'function') return copy(words.url);
  // The picture goes along only if this share sheet says it takes it.
  const files =
    file !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      ? [file]
      : null;
  try {
    await navigator.share(files ? { ...words, files } : words);
    return 'shared';
  } catch (error) {
    // The user closed the sheet: there is nothing to make up for.
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return copy(words.url);
  }
}
