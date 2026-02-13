/**
 * TabBar Component
 *
 * Navigation tabs with keyboard support.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useCallback } from "react";

export interface Tab {
  id: string;
  label: string;
  shortcut?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  hotkeysEnabled?: boolean;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  hotkeysEnabled = true,
}: TabBarProps) {
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = useCallback(() => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : tabs.length - 1;
    onTabChange(tabs[newIndex].id);
  }, [activeIndex, tabs, onTabChange]);

  const handleNextTab = useCallback(() => {
    const newIndex = activeIndex < tabs.length - 1 ? activeIndex + 1 : 0;
    onTabChange(tabs[newIndex].id);
  }, [activeIndex, tabs, onTabChange]);

  useInput((input, key) => {
    if (!hotkeysEnabled) {
      return;
    }

    if (input === "[") {
      handlePrevTab();
    } else if (input === "]") {
      handleNextTab();
    }

    const num = Number.parseInt(input, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= tabs.length) {
      onTabChange(tabs[num - 1].id);
    }
  });

  return (
    <Box flexDirection="row" height={1}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const shortcut = tab.shortcut || String(index + 1);

        return (
          <Box flexDirection="row" key={tab.id}>
            <Text
              backgroundColor={isActive ? "cyan" : undefined}
              bold={isActive}
              color={isActive ? "black" : "gray"}
            >
              {isActive ? "▶" : " "} [{shortcut}] {tab.label}{" "}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
