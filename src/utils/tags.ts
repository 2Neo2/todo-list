export const TAGS = {
  work: "Работа",
  study: "Учёба",
  personal: "Личное",
  health: "Здоровье",
} as const;
export type Tag = keyof typeof TAGS;
export const TAG_IDS = Object.keys(TAGS) as Tag[];
