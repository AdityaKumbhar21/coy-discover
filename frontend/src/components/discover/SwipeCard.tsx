"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import { swipeDecision } from "../../lib/swipe-gesture";
import { ProfileCard } from "./ProfileCard";
import type { Decision, Profile } from "./types";

type Props = {
  profile: Profile;
  pendingDecision: Decision | null;
  disabled: boolean;
  onDecision: (decision: Decision) => void;
};

export function SwipeCard({
  profile,
  pendingDecision,
  disabled,
  onDecision,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelled = useRef(false);
  const committed = useRef(false);
  const [feedback, setFeedback] = useState<Decision | null>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-200, 0, 200],
    reduceMotion ? [0, 0, 0] : [-12, 0, 12],
  );
  const canDrag = !disabled && pendingDecision === null;

  return (
    <div className="coy-swipe-stage -mx-3 overflow-hidden px-3 pb-2 pt-1">
      <motion.div
        ref={cardRef}
        className="mx-auto h-full w-full max-w-[var(--stage-w)]"
        aria-describedby="swipe-instructions"
        style={{
          x,
          rotate,
          touchAction: "pan-y",
          cursor: pendingDecision ? "progress" : canDrag ? "grab" : "default",
        }}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        drag={canDrag ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        dragMomentum={false}
        dragSnapToOrigin
        onPointerDown={() => {
          cancelled.current = false;
        }}
        onPointerCancel={() => {
          cancelled.current = true;
          setFeedback(null);
          x.set(0);
        }}
        onDrag={(_event, info) => {
          setFeedback(
            Math.abs(info.offset.x) > 20 &&
              Math.abs(info.offset.x) > Math.abs(info.offset.y)
              ? info.offset.x > 0
                ? "like"
                : "pass"
              : null,
          );
        }}
        onDragEnd={(_event, info) => {
          setFeedback(null);
          if (!canDrag || cancelled.current || committed.current) return;
          const decision = swipeDecision(
            info.offset.x,
            info.offset.y,
            cardRef.current?.clientWidth ?? 280,
          );
          if (decision) {
            committed.current = true;
            onDecision(decision);
          }
        }}
      >
        <ProfileCard
          profile={profile}
          feedback={pendingDecision ?? feedback}
          pending={pendingDecision !== null}
        />
      </motion.div>
    </div>
  );
}
