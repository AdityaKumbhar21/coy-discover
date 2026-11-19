export type Decision = "like" | "pass";
export type MainTab = "home" | "discover";
export type DiscoverView = "feed" | "matches";

export type Profile = {
  id: number;
  name: string;
  age: number;
  photoUrl: string;
  bio: string;
  cityOrCollege: string;
  interests: string[];
};

export type Match = {
  id: number;
  profile: Profile;
  createdAt: string; // UTC ISO timestamp
};

// Controlled component callbacks:
// onTabChange(tab: MainTab): void
// onViewChange(view: DiscoverView): void
// onDecision(decision: Decision): void
// onRetry(): void
// onClose(): void
// onViewMatches(): void
