import { themeConfig } from "./index";
import type { Theme } from "./colors";

export function useTheme(theme: Theme = "dark") {
  return themeConfig[theme];
}
