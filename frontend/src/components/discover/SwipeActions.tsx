import type { Decision } from "./types";

type SwipeActionsProps = {
  disabled: boolean;
  pendingDecision: Decision | null;
  errorMessage: string | null;
  onDecision: (decision: Decision) => void;
  onRetry: () => void;
};

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function SwipeActions({
  disabled,
  pendingDecision,
  errorMessage,
  onDecision,
  onRetry,
}: SwipeActionsProps) {
  const locked = disabled || pendingDecision !== null;
  const statusText =
    pendingDecision === "like"
      ? "Saving your like…"
      : pendingDecision === "pass"
        ? "Saving your pass…"
        : "";

  return (
    <div className="mx-auto flex w-full max-w-[var(--stage-w)] shrink-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="coy-btn coy-btn--pass"
          disabled={locked}
          aria-busy={pendingDecision === "pass"}
          onClick={() => onDecision("pass")}
        >
          {pendingDecision === "pass" ? (
            <Spinner />
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          )}
          Pass
        </button>

        <button
          type="button"
          className="coy-btn coy-btn--like"
          disabled={locked}
          aria-busy={pendingDecision === "like"}
          onClick={() => onDecision("like")}
        >
          {pendingDecision === "like" ? (
            <Spinner />
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 21s-8-5.2-9.5-10.3C1.5 7.2 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.2 4.5 6.7C20 15.8 12 21 12 21z" />
            </svg>
          )}
          Like
        </button>
      </div>

      {/* Polite status region: announces saving without re-reading the card */}
      <p role="status" aria-live="polite" className="sr-only">
        {statusText}
      </p>

      {errorMessage && (
        <div role="alert" className="coy-alert">
          <p className="min-w-0 flex-1 break-words text-[0.9375rem] font-bold">
            {errorMessage}
          </p>
          <button
            type="button"
            className="coy-btn coy-btn--like coy-btn--sm"
            disabled={pendingDecision !== null}
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default SwipeActions;
