"use client";

import { useState } from "react";
import type { Match } from "./types";

const PLACEHOLDER_SRC = "/images/profile-placeholder.svg";

type MatchesListProps = {
  matches: Match[];
};

function MatchRow({ match }: { match: Match }) {
  const { profile } = match;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src =
    failedUrl === profile.photoUrl ? PLACEHOLDER_SRC : profile.photoUrl;

  return (
    <li className="coy-tile flex min-w-0 flex-col">
      <div className="aspect-square w-full overflow-hidden border-b-[2.5px] border-ink bg-field">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Photo of ${profile.name}`}
          onError={() => setFailedUrl(profile.photoUrl)}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1 p-3">
        <p className="font-display flex flex-wrap items-baseline gap-x-2 text-[1.25rem]">
          <span className="min-w-0 break-words">{profile.name}</span>
          <span className="sr-only">, </span>
          <span className="text-base font-bold tracking-normal text-berry">
            {profile.age}
          </span>
        </p>
        <p className="break-words text-sm font-bold text-muted">
          {profile.cityOrCollege}
        </p>
      </div>
    </li>
  );
}

export function MatchesList({ matches }: MatchesListProps) {
  return (
    <ul aria-label="Matches" className="mx-auto grid w-full grid-cols-2 gap-4">
      {matches.map((match) => (
        <MatchRow key={match.id} match={match} />
      ))}
    </ul>
  );
}

export default MatchesList;
