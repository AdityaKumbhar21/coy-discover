import type { ReactNode } from "react";
import type { MainTab } from "./types";

type BottomNavigationProps = {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
};

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TABS: { id: MainTab; label: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg {...iconProps}>
        <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    id: "discover",
    label: "Discover",
    icon: (
      <svg {...iconProps}>
        <path d="M12 21s-8-5.2-9.5-10.3C1.5 7.2 3.7 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.5 3.2 4.5 6.7C20 15.8 12 21 12 21z" />
      </svg>
    ),
  },
];

export function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className="z-30 shrink-0 border-t-[2.5px] border-ink bg-white pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="mx-auto flex h-[var(--nav-h)] w-full max-w-[480px] items-center gap-3 px-4">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onTabChange(tab.id)}
                className={[
                  "flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[2.5px] px-4 text-base font-extrabold",
                  "transition-[background-color,box-shadow] duration-[var(--duration-quick)]",
                  active
                    ? "border-ink bg-pink-wash text-ink shadow-pop-sm"
                    : "border-transparent text-muted hover:bg-field hover:text-ink",
                ].join(" ")}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNavigation;
