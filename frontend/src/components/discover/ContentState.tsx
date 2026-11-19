type ContentStateProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description: string;
  onRetry?: () => void;
};

export function ContentState({
  kind,
  title,
  description,
  onRetry,
}: ContentStateProps) {
  if (kind === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="coy-surface mx-auto w-full max-w-[var(--stage-w)] overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="coy-skeleton aspect-[4/3] w-full border-b-[2.5px] border-ink"
        />
        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-[1.5rem]">{title}</h2>
          <p className="break-words text-base leading-relaxed text-muted">
            {description}
          </p>
          <div aria-hidden="true" className="flex gap-2">
            <span className="coy-skeleton h-8 w-20 rounded-full border-2 border-ink" />
            <span className="coy-skeleton h-8 w-24 rounded-full border-2 border-ink" />
            <span className="coy-skeleton h-8 w-16 rounded-full border-2 border-ink" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "error") {
    return (
      <div
        role="alert"
        className="coy-surface mx-auto flex w-full max-w-[var(--stage-w)] flex-col items-center gap-4 bg-pink-wash p-8 text-center"
      >
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-white text-[2rem] font-extrabold shadow-pop-sm"
        >
          !
        </span>
        <h2 className="break-words text-[1.75rem]">{title}</h2>
        <p className="break-words text-base leading-relaxed text-ink-soft">
          {description}
        </p>
        {onRetry && (
          <button
            type="button"
            className="coy-btn coy-btn--like mt-1"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="coy-surface mx-auto flex w-full max-w-[var(--stage-w)] flex-col items-center gap-4 bg-mint p-8 text-center">
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] border-dashed border-ink bg-sun"
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="#17121f">
          <path d="M12 21s-8-5.2-9.5-10.3C1.5 7.2 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.2 4.5 6.7C20 15.8 12 21 12 21z" />
        </svg>
      </span>
      <h2 className="break-words text-[1.75rem]">{title}</h2>
      <p className="break-words text-base leading-relaxed text-ink-soft">
        {description}
      </p>
    </div>
  );
}

export default ContentState;
