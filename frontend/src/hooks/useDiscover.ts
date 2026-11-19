"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Decision } from "../components/discover/types";
import { ApiError, getFeed, getMatches, sendSwipe } from "../lib/api/discover";
import type { SwipeInput } from "../lib/api/discover";
import { discoverReducer, initialDiscoverState } from "../lib/discover-state";

function message(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export function useDiscover() {
  const [state, dispatch] = useReducer(discoverReducer, initialDiscoverState);
  const feedRequest = useRef<{
    id: number;
    controller: AbortController;
  } | null>(null);
  const matchesRequest = useRef<{
    id: number;
    controller: AbortController;
  } | null>(null);
  const swipeLocked = useRef(false);
  const mounted = useRef(false);

  const refreshFeed = useCallback(async () => {
    if (swipeLocked.current) return;
    feedRequest.current?.controller.abort();
    const current = {
      id: (feedRequest.current?.id ?? 0) + 1,
      controller: new AbortController(),
    };
    feedRequest.current = current;
    dispatch({ type: "feed/start", requestId: current.id });
    try {
      const items = await getFeed(current.controller.signal);
      if (mounted.current)
        dispatch({ type: "feed/success", requestId: current.id, items });
    } catch (error: unknown) {
      if (!current.controller.signal.aborted && mounted.current)
        dispatch({
          type: "feed/error",
          requestId: current.id,
          message: message(error),
        });
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    matchesRequest.current?.controller.abort();
    const current = {
      id: (matchesRequest.current?.id ?? 0) + 1,
      controller: new AbortController(),
    };
    matchesRequest.current = current;
    dispatch({ type: "matches/start", requestId: current.id });
    try {
      const items = await getMatches(current.controller.signal);
      if (mounted.current)
        dispatch({ type: "matches/success", requestId: current.id, items });
    } catch (error: unknown) {
      if (!current.controller.signal.aborted && mounted.current)
        dispatch({
          type: "matches/error",
          requestId: current.id,
          message: message(error),
        });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refreshFeed();
    return () => {
      mounted.current = false;
      feedRequest.current?.controller.abort();
      matchesRequest.current?.controller.abort();
    };
  }, [refreshFeed]);

  const performSwipe = useCallback(
    async (input: SwipeInput) => {
      if (swipeLocked.current) return;
      swipeLocked.current = true;
      dispatch({ type: "swipe/start", input });
      try {
        const result = await sendSwipe(input);
        if (mounted.current) {
          dispatch({ type: "swipe/success", result });
          void refreshMatches();
        }
      } catch (error: unknown) {
        if (mounted.current) {
          if (
            error instanceof ApiError &&
            (error.code === "SWIPE_CONFLICT" ||
              error.code === "PROFILE_NOT_FOUND")
          ) {
            dispatch({
              type: "swipe/reconcile",
              input,
              message: error.message,
            });
            void refreshMatches();
          } else
            dispatch({ type: "swipe/error", input, message: message(error) });
        }
      } finally {
        swipeLocked.current = false;
      }
    },
    [refreshMatches],
  );

  const decide = useCallback(
    (decision: Decision) => {
      const current = state.feed.items[0];
      if (
        !current ||
        state.failedSwipe ||
        state.newMatch ||
        state.feed.status !== "ready"
      )
        return;
      void performSwipe({ profileId: current.id, decision });
    },
    [state.feed, state.failedSwipe, state.newMatch, performSwipe],
  );
  const retrySwipe = useCallback(() => {
    if (state.failedSwipe) void performSwipe(state.failedSwipe);
  }, [state.failedSwipe, performSwipe]);
  const closeMatch = useCallback(() => dispatch({ type: "match/close" }), []);

  return { state, refreshFeed, refreshMatches, decide, retrySwipe, closeMatch };
}
