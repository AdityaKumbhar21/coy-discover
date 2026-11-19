import type { Match, Profile } from "../components/discover/types";
import type { SwipeInput, SwipeResult } from "./api/discover";

type Resource<T> = {
  status: "loading" | "ready" | "error";
  items: T[];
  error: string | null;
  requestId: number;
};
export type DiscoverState = {
  feed: Resource<Profile>;
  matches: Resource<Match>;
  pending: SwipeInput | null;
  failedSwipe: SwipeInput | null;
  swipeError: string | null;
  newMatch: Match | null;
  confirmedIds: number[];
  notice: string;
};
export const initialDiscoverState: DiscoverState = {
  feed: { status: "loading", items: [], error: null, requestId: 0 },
  matches: { status: "loading", items: [], error: null, requestId: 0 },
  pending: null,
  failedSwipe: null,
  swipeError: null,
  newMatch: null,
  confirmedIds: [],
  notice: "",
};
export type DiscoverAction =
  | { type: "feed/start" | "matches/start"; requestId: number }
  | { type: "feed/success"; requestId: number; items: Profile[] }
  | { type: "matches/success"; requestId: number; items: Match[] }
  | { type: "feed/error" | "matches/error"; requestId: number; message: string }
  | { type: "swipe/start"; input: SwipeInput }
  | { type: "swipe/success"; result: SwipeResult }
  | { type: "swipe/error"; input: SwipeInput; message: string }
  | { type: "swipe/reconcile"; input: SwipeInput; message: string }
  | { type: "match/close" };

export function discoverReducer(
  state: DiscoverState,
  action: DiscoverAction,
): DiscoverState {
  switch (action.type) {
    case "feed/start":
      return {
        ...state,
        feed: {
          ...state.feed,
          status: "loading",
          error: null,
          requestId: action.requestId,
        },
      };
    case "matches/start":
      return {
        ...state,
        matches: {
          ...state.matches,
          status: "loading",
          error: null,
          requestId: action.requestId,
        },
      };
    case "feed/success": {
      if (action.requestId !== state.feed.requestId) return state;
      if (state.pending)
        return { ...state, feed: { ...state.feed, status: "ready" } };
      const items = action.items.filter(
        (profile) => !state.confirmedIds.includes(profile.id),
      );
      const resolved =
        state.failedSwipe !== null &&
        !items.some((profile) => profile.id === state.failedSwipe?.profileId);
      return {
        ...state,
        feed: { ...state.feed, status: "ready", items, error: null },
        failedSwipe: resolved ? null : state.failedSwipe,
        swipeError: resolved ? null : state.swipeError,
      };
    }
    case "matches/success":
      return action.requestId === state.matches.requestId
        ? {
            ...state,
            matches: {
              ...state.matches,
              status: "ready",
              items: action.items,
              error: null,
            },
          }
        : state;
    case "feed/error":
      if (state.pending)
        return {
          ...state,
          feed: { ...state.feed, status: "ready", error: null },
        };
      return action.requestId === state.feed.requestId
        ? {
            ...state,
            feed: { ...state.feed, status: "error", error: action.message },
          }
        : state;
    case "matches/error":
      return action.requestId === state.matches.requestId
        ? {
            ...state,
            matches: {
              ...state.matches,
              status: "error",
              error: action.message,
            },
          }
        : state;
    case "swipe/start":
      return state.pending
        ? state
        : {
            ...state,
            pending: action.input,
            failedSwipe: null,
            swipeError: null,
            notice: "",
          };
    case "swipe/error":
      return {
        ...state,
        pending: null,
        failedSwipe: action.input,
        swipeError: action.message,
      };
    case "swipe/success": {
      const { result } = action;
      const known = result.match;
      const items = known
        ? [
            known,
            ...state.matches.items.filter((match) => match.id !== known.id),
          ]
        : state.matches.items;
      return {
        ...state,
        pending: null,
        failedSwipe: null,
        swipeError: null,
        confirmedIds: [...state.confirmedIds, result.swipe.profileId],
        feed: {
          ...state.feed,
          items: state.feed.items.filter(
            (profile) => profile.id !== result.swipe.profileId,
          ),
        },
        matches: { ...state.matches, items },
        newMatch: result.matchCreated ? result.match : state.newMatch,
        notice:
          result.swipe.decision === "like" ? "Like saved." : "Pass saved.",
      };
    }
    case "swipe/reconcile":
      return {
        ...state,
        pending: null,
        failedSwipe: null,
        swipeError: null,
        confirmedIds: [...state.confirmedIds, action.input.profileId],
        feed: {
          ...state.feed,
          items: state.feed.items.filter(
            (profile) => profile.id !== action.input.profileId,
          ),
        },
        notice: action.message,
      };
    case "match/close":
      return { ...state, newMatch: null };
  }
}
