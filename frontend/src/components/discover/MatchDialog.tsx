"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Match } from "./types";

const PLACEHOLDER_SRC = "/images/profile-placeholder.svg";

type MatchDialogProps = {
  open: boolean;
  match: Match | null;
  onClose: () => void;
  onViewMatches: () => void;
};

export function MatchDialog({
  open,
  match,
  onClose,
  onViewMatches,
}: MatchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const isOpen = open && match !== null;
  const photoUrl = match?.profile.photoUrl ?? null;
  const src =
    photoUrl === null || failedUrl === photoUrl ? PLACEHOLDER_SRC : photoUrl;

  // The native modal dialog provides the focus trap and inert background.
  // Opening is driven only by props; focus goes back to the opener on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body &&
        !document.activeElement.matches(":disabled")
          ? document.activeElement
          : null;
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      const target =
        returnFocusRef.current?.isConnected &&
        !returnFocusRef.current.matches(":disabled")
          ? returnFocusRef.current
          : document.getElementById("discover-heading");
      target?.focus();
      returnFocusRef.current = null;
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="coy-dialog"
      onCancel={(event) => {
        // Escape: let the controller decide, don't close natively
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {match && (
        <div className="relative flex flex-col items-center gap-5 px-6 pb-6 pt-10 text-center">
          <span
            aria-hidden="true"
            className="coy-confetti left-6 top-6 h-4 w-4 rotate-12 rounded-sm bg-sun"
          />
          <span
            aria-hidden="true"
            className="coy-confetti right-7 top-10 h-3.5 w-3.5 rounded-full bg-pink"
          />
          <span
            aria-hidden="true"
            className="coy-confetti right-12 top-[7.5rem] h-3 w-6 -rotate-12 rounded-full bg-mint"
          />
          <span
            aria-hidden="true"
            className="coy-confetti left-9 top-[8.5rem] h-3 w-3 rounded-full bg-pink-wash"
          />

          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Photo of ${match.profile.name}`}
              onError={() => setFailedUrl(match.profile.photoUrl)}
              className="h-40 w-40 -rotate-3 rounded-full border-[2.5px] border-ink bg-field object-cover shadow-pop"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-2 flex h-12 w-12 rotate-6 items-center justify-center rounded-full border-[2.5px] border-ink bg-sun shadow-pop-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#17121f">
                <path d="M12 21s-8-5.2-9.5-10.3C1.5 7.2 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.2 4.5 6.7C20 15.8 12 21 12 21z" />
              </svg>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-[2.25rem]">
              It’s a match!
            </h2>
            <p
              id={descriptionId}
              className="break-words text-base leading-relaxed text-ink-soft"
            >
              You and {match.profile.name} liked each other.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              autoFocus
              className="coy-btn coy-btn--like w-full"
              onClick={onViewMatches}
            >
              View matches
            </button>
            <button
              type="button"
              className="coy-btn coy-btn--pass w-full"
              onClick={onClose}
            >
              Keep swiping
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default MatchDialog;
