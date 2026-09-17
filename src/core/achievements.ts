export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  {
    id: "FIVE CLOSE CALLS",
    name: "Close Shave",
    icon: "⚡",
    desc: "Pull off 5 narrow escapes in a single run.",
  },
  {
    id: "OUTSMARTER",
    name: "Bot Demolition",
    icon: "💥",
    desc: "Trick chasing security bots into crashing into each other.",
  },
  {
    id: "SNACK MASTER",
    name: "Snack Master",
    icon: "🍿",
    desc: "Chain a 10+ snack streak without dropping the timer.",
  },
  {
    id: "GOLDEN DONUT",
    name: "Golden Snatch",
    icon: "🍩",
    desc: "Find and snatch a rare high-value Golden Donut.",
  },
  {
    id: "SNACK FRENZY",
    name: "Frenzy Runner",
    icon: "🎒",
    desc: "Grab a snack bag to unleash a 2× Snack Frenzy.",
  },
  {
    id: "MIDNIGHT SURVIVOR",
    name: "Midnight Survivor",
    icon: "🌙",
    desc: "Evade security and survive 60+ seconds in a single run.",
  },
];
