export type CategoryKey = "digital_privacy" | "think_before_you_post" | "cyber_heroes";

export const CATEGORIES: { key: CategoryKey; label: string; area: string; theme: string }[] = [
  { key: "digital_privacy", label: "Digital Privacy", area: "Area 02", theme: "Protect Your Personal Information" },
  { key: "think_before_you_post", label: "Think Before You Post", area: "Area 03", theme: "Be Responsible Online" },
  { key: "cyber_heroes", label: "Cyber Heroes", area: "Area 04", theme: "Featured Student Artwork" },
];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
