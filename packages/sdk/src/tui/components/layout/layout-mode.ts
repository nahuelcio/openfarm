export type LayoutMode = "triple" | "dual" | "single";

export function getLayoutMode(columns: number): LayoutMode {
  if (columns >= 120) {
    return "triple";
  }
  if (columns >= 90) {
    return "dual";
  }
  return "single";
}
