import type { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";
import type { DiscoverView, MainTab } from "./types";

type Props = {
  activeTab: MainTab;
  activeView: DiscoverView;
  onTabChange: (tab: MainTab) => void;
  onViewChange: (view: DiscoverView) => void;
  children: ReactNode;
};

export function DiscoverShell({
  activeTab,
  activeView,
  onTabChange,
  onViewChange,
  children,
}: Props) {
  return (
    <div className="coy-app">
      {activeTab === "discover" ? (
        <>
          <header className="coy-header">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.2em] text-berry">
                Coy
              </p>
              <h1
                id="discover-heading"
                tabIndex={-1}
                className="break-words text-[1.875rem]"
              >
                {activeView === "feed" ? "Discover" : "Your matches"}
              </h1>
            </div>
            <button
              type="button"
              className="coy-btn coy-btn--sm shrink-0 bg-sun"
              onClick={() =>
                onViewChange(activeView === "feed" ? "matches" : "feed")
              }
            >
              {activeView === "feed" ? "Matches" : "Back"}
            </button>
          </header>
          <main
            id="discover-main"
            aria-labelledby="discover-heading"
            className="coy-main"
          >
            {children}
          </main>
        </>
      ) : (
        <main aria-label="Home" className="min-h-0 flex-1" />
      )}
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
