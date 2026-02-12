import { Box, Text, useApp, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { useStore } from "../../store";
import { useThemeColors } from "../../theme/hooks";

export type SectionId =
  | "dashboard"
  | "execute"
  | "history"
  | "workflows"
  | "context"
  | "remotes"
  | "task-loop"
  | "agent-chat";

interface ImprovedSidebarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

interface NavItemProps {
  id: SectionId;
  label: string;
  shortcut: string;
  isActive: boolean;
  isFocused: boolean;
  onPress: () => void;
}

function NavItem({
  label,
  shortcut,
  isActive,
  isFocused,
  onPress,
}: NavItemProps) {
  const colors = useThemeColors();

  // Background: primary if active, border if focused (but not active), none otherwise
  const bgColor = isActive
    ? colors.primary
    : isFocused
      ? colors.border
      : undefined;

  return (
    <Box
      backgroundColor={bgColor}
      flexDirection="row"
      gap={1}
      onMouseDown={onPress}
      paddingX={1}
      paddingY={1}
    >
      <Text
        color={isActive ? colors.selectedFg : colors.muted}
        dimColor={!(isActive || isFocused)}
      >
        {shortcut}
      </Text>
      <Text
        bold={isActive || isFocused}
        color={isActive ? colors.selectedFg : colors.foreground}
      >
        {label}
      </Text>
    </Box>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <Box paddingX={1} paddingY={1}>
      <Text bold color={colors.primary}>
        {title}
      </Text>
    </Box>
  );
}

export function ImprovedSidebar({
  activeSection,
  onSectionChange,
}: ImprovedSidebarProps) {
  const colors = useThemeColors();
  const { exit } = useApp();
  const isTyping = useStore((state) => state.isTyping);

  // Track focused index for keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(() => {
    const sections: SectionId[] = [
      "dashboard",
      "execute",
      "history",
      "workflows",
      "context",
      "remotes",
      "task-loop",
    ];
    return sections.indexOf(activeSection);
  });

  const sections: Array<{ id: SectionId; label: string; shortcut: string }> = [
    { id: "dashboard", label: "Dashboard", shortcut: "1" },
    { id: "execute", label: "Execute", shortcut: "2" },
    { id: "history", label: "History", shortcut: "3" },
    { id: "workflows", label: "Workflows", shortcut: "4" },
    { id: "context", label: "Context", shortcut: "5" },
    { id: "remotes", label: "Remotes", shortcut: "6" },
    { id: "task-loop", label: "Task Loop", shortcut: "7" },
  ];

  // Sync focused index when active section changes externally (e.g., via [ ] shortcuts)
  useEffect(() => {
    const newIndex = sections.findIndex((s) => s.id === activeSection);
    if (newIndex !== -1) {
      setFocusedIndex(newIndex);
    }
  }, [activeSection]);

  // Handle keyboard input
  useInput((input) => {
    // Number keys 1-7 for direct navigation (global shortcut)
    // BUT only when NOT typing in an input field
    const num = Number.parseInt(input, 10);
    if (!(isTyping || Number.isNaN(num)) && num >= 1 && num <= 7) {
      const section = sections[num - 1];
      if (section) {
        setFocusedIndex(num - 1);
        onSectionChange(section.id);
      }
      return;
    }

    // 'q' to quit (global shortcut) - always works even when typing
    if (input === "q") {
      exit();
    }
  });

  return (
    <Box borderStyle="single" flexDirection="column" height="100%" width={20}>
      {/* Logo/Header */}
      <Box borderStyle={undefined} paddingX={1} paddingY={1}>
        <Text bold color={colors.primary}>
          OPENFARM
        </Text>
      </Box>

      {/* Main Navigation */}
      <Box flexDirection="column" flexGrow={1}>
        <SectionHeader title="Navigation" />
        {sections.map((section, index) => (
          <NavItem
            id={section.id}
            isActive={activeSection === section.id}
            isFocused={focusedIndex === index}
            key={section.id}
            label={section.label}
            onPress={() => {
              setFocusedIndex(index);
              onSectionChange(section.id);
            }}
            shortcut={section.shortcut}
          />
        ))}
      </Box>

      {/* Keyboard Help - Only showing REAL working shortcuts */}
      <Box borderStyle="single" flexDirection="column" margin={1} paddingX={1}>
        <Text color={colors.secondary} dimColor>
          Shortcuts:
        </Text>
        <Text color={colors.muted} dimColor>
          1-8 jump section
        </Text>
        <Text color={colors.muted} dimColor>
          ↑↓ navigate list
        </Text>
        <Text color={colors.muted} dimColor>
          Esc go back
        </Text>
        <Text color={colors.muted} dimColor>
          q quit
        </Text>
      </Box>
    </Box>
  );
}
