import type { DemErrorReason } from '../terrain/dem';

const SENTENCES: Record<DemErrorReason, string> = {
  load: 'This DEM could not be loaded.',
  units: 'This DEM is not in meters with square cells, so its slopes cannot be computed.',
};

interface ErrorCardProps {
  reason: DemErrorReason;
  onRetry: () => void;
}

export function ErrorCard({ reason, onRetry }: ErrorCardProps) {
  return (
    <div className="empty terrain__error" role="alert">
      <p className="empty__text">{SENTENCES[reason]}</p>
      <button type="button" className="btn btn--tonal" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
