import { Box, Text } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";
import type { Tab } from "../tabs/tab-bar";

type SideNavMode = "vertical" | "horizontal";

interface SideNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  mode: SideNavMode;
}

const TAB_ICONS: Record<string, string> = {
  dashboard: "⌂",
  execute: "▶",
  history: "◷",
  workflows: "≣",
  context: "⌘",
  remotes: "◎",
  "task-loop": "↻",
};

function getShortcut(tab: Tab, index: number): string {
  return tab.shortcut || String(index + 1);
}

export function SideNav({ tabs, activeTab, onTabChange, mode }: SideNavProps) {
  const colors = useThemeColors();

  return (
    <Box
      borderStyle="single"
      flexDirection={mode === "vertical" ? "column" : "row"}
      paddingX={mode === "vertical" ? 0 : 1}
      width={mode === "vertical" ? 8 : undefined}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTab;
        const label =
          mode === "vertical" ? TAB_ICONS[tab.id] || "•" : tab.label;
        const shortcut = getShortcut(tab, index);

        return (
          <Box
            backgroundColor={selected ? colors.primary : undefined}
            flexDirection={mode === "vertical" ? "column" : "row"}
            key={tab.id}
            onMouseDown={() => onTabChange(tab.id)}
            paddingX={mode === "vertical" ? 0 : 1}
            paddingY={mode === "vertical" ? 1 : 0}
            width={mode === "vertical" ? 6 : undefined}
          >
            <Text
              bold={selected}
              color={selected ? colors.selectedFg : colors.muted}
            >
              {mode === "vertical" ? ` ${label} ` : ` ${shortcut} ${label} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
