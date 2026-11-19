"use client";

import { useEffect, useState } from "react";
import { DiscoverShell } from "../components/discover/DiscoverShell";
import { SwipeCard } from "../components/discover/SwipeCard";
import { SwipeActions } from "../components/discover/SwipeActions";
import { ContentState } from "../components/discover/ContentState";
import { MatchDialog } from "../components/discover/MatchDialog";
import { MatchesList } from "../components/discover/MatchesList";
import type { DiscoverView, MainTab } from "../components/discover/types";
import { useDiscover } from "../hooks/useDiscover";

export default function Page() {
  const [activeTab, setActiveTab] = useState<MainTab>("discover");
  const [activeView, setActiveView] = useState<DiscoverView>("feed");
  const { state, refreshFeed, refreshMatches, decide, retrySwipe, closeMatch } =
    useDiscover();

  useEffect(() => {
    const refresh = () => {
      if (activeTab === "discover")
        void (activeView === "feed" ? refreshFeed() : refreshMatches());
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [activeTab, activeView, refreshFeed, refreshMatches]);

  function changeTab(tab: MainTab) {
    setActiveTab(tab);
    if (tab === "discover")
      void (activeView === "feed" ? refreshFeed() : refreshMatches());
  }
  function changeView(view: DiscoverView) {
    setActiveView(view);
    void (view === "feed" ? refreshFeed() : refreshMatches());
  }

  const current = state.feed.items[0];
  useEffect(() => {
    // Scroll inside the phone frame, keeping its header and navigation visible.
    document.getElementById("discover-main")?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [activeTab, activeView, current?.id]);
  let content;
  if (activeView === "matches") {
    content =
      state.matches.status === "loading" ? (
        <ContentState
          kind="loading"
          title="Loading your matches"
          description="Finding your mutual connections."
        />
      ) : state.matches.status === "error" ? (
        <ContentState
          kind="error"
          title="Couldn’t load matches"
          description={state.matches.error ?? "Please try again."}
          onRetry={() => void refreshMatches()}
        />
      ) : state.matches.items.length === 0 ? (
        <ContentState
          kind="empty"
          title="No matches yet"
          description="When you both like each other, your match will appear here."
        />
      ) : (
        <MatchesList matches={state.matches.items} />
      );
  } else if (state.feed.status === "error") {
    content = (
      <ContentState
        kind="error"
        title="Couldn’t load profiles"
        description={state.feed.error ?? "Please try again."}
        onRetry={() => void refreshFeed()}
      />
    );
  } else if (!current) {
    content =
      state.feed.status === "loading" ? (
        <ContentState
          kind="loading"
          title="Finding your next connection"
          description="Getting your profiles ready."
        />
      ) : (
        <ContentState
          kind="empty"
          title="No more profiles"
          description="You’re all caught up. Check your matches for mutual connections."
        />
      );
  } else {
    content = (
      <div className="coy-feed">
        <p id="swipe-instructions" className="sr-only">
          Swipe right to like, left to pass, or use the buttons below.
        </p>
        <SwipeCard
          key={current.id}
          profile={current}
          pendingDecision={state.pending?.decision ?? null}
          disabled={
            state.feed.status !== "ready" ||
            state.failedSwipe !== null ||
            state.newMatch !== null
          }
          onDecision={decide}
        />
        <SwipeActions
          disabled={
            state.feed.status !== "ready" ||
            state.failedSwipe !== null ||
            state.newMatch !== null
          }
          pendingDecision={state.pending?.decision ?? null}
          errorMessage={state.swipeError}
          onDecision={decide}
          onRetry={retrySwipe}
        />
      </div>
    );
  }

  return (
    <>
      <DiscoverShell
        activeTab={activeTab}
        activeView={activeView}
        onTabChange={changeTab}
        onViewChange={changeView}
      >
        {content}
        <p className="sr-only" role="status">
          {state.notice}
        </p>
      </DiscoverShell>
      <MatchDialog
        open={activeTab === "discover" && state.newMatch !== null}
        match={state.newMatch}
        onClose={closeMatch}
        onViewMatches={() => {
          closeMatch();
          setActiveTab("discover");
          changeView("matches");
        }}
      />
    </>
  );
}
