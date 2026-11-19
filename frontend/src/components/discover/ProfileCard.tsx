"use client";

import { useId, useState } from "react";
import type { Decision, Profile } from "./types";

const PLACEHOLDER_SRC = "/images/profile-placeholder.svg";

type ProfileCardProps = {
  profile: Profile;
  feedback: Decision | null;
  pending: boolean;
};

export function ProfileCard({ profile, feedback, pending }: ProfileCardProps) {
  const headingId = useId();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src =
    failedUrl === profile.photoUrl ? PLACEHOLDER_SRC : profile.photoUrl;

  return (
    <article
      aria-labelledby={headingId}
      aria-busy={pending}
      data-feedback={feedback ?? "none"}
      className="coy-surface coy-profile-card mx-auto w-full max-w-[var(--stage-w)] overflow-hidden"
    >
      <div className="coy-profile-photo relative w-full overflow-hidden border-b-[2.5px] border-ink bg-field">
        {/* Plain img: photo hosts are not known at design time */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Photo of ${profile.name}`}
          draggable={false}
          onError={() => setFailedUrl(profile.photoUrl)}
          className="h-full w-full select-none object-cover"
        />

        <span className="coy-stamp coy-stamp--like" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-8-5.2-9.5-10.3C1.5 7.2 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.2 4.5 6.7C20 15.8 12 21 12 21z" />
          </svg>
          Like
        </span>
        <span className="coy-stamp coy-stamp--pass" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
          Pass
        </span>
      </div>

      <div className="coy-profile-details">
        <h2
          id={headingId}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 break-words text-[1.75rem]"
        >
          <span className="min-w-0 break-words">{profile.name}</span>
          <span className="sr-only">, </span>
          <span className="coy-age">{profile.age}</span>
        </h2>

        <p className="flex items-start gap-2 text-[0.9375rem] font-bold text-muted">
          <svg
            className="mt-0.5 shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11z" />
            <circle cx="12" cy="10" r="2.2" />
          </svg>
          <span className="min-w-0 break-words">{profile.cityOrCollege}</span>
        </p>

        <p className="break-words text-[0.9375rem] leading-snug text-ink-soft">
          {profile.bio}
        </p>

        {profile.interests.length > 0 && (
          <ul aria-label="Interests" className="flex flex-wrap gap-2">
            {profile.interests.map((interest, index) => (
              <li key={`${interest}-${index}`} className="coy-chip">
                {interest}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default ProfileCard;
