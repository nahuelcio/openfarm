import { Box, Text } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

export type SectionId =
  | "dashboard"
  | "execute"
  | "history"
  | "workflows"
  | "context"
  | "remotes"
  | "task-loop";

interface ImprovedSidebarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

interface NavItemProps {
  id: SectionId;
  label: string;
  shortcut: string;
  isActive: boolean;
  onPress: () => void;
}

function NavItem({ label, shortcut, isActive, onPress }: NavItemProps) {
  const colors = useThemeColors();

  return (
    <Box
      backgroundColor={isActive ? colors.primary : undefined}
      flexDirection="row"
      gap={1}
      onMouseDown={onPress}
      paddingX={1}
      paddingY={1}
    >
      <Text
        color={isActive ? colors.selectedFg : colors.muted}
        dimColor={!isActive}
      >
        {shortcut}
      </Text>
      <Text
        bold={isActive}
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

  const sections: Array<{ id: SectionId; label: string; shortcut: string }> = [
    { id: "dashboard", label: "Dashboard", shortcut: "1" },
    { id: "execute", label: "Execute", shortcut: "2" },
    { id: "history", label: "History", shortcut: "3" },
    { id: "workflows", label: "Workflows", shortcut: "4" },
    { id: "context", label: "Context", shortcut: "5" },
    { id: "remotes", label: "Remotes", shortcut: "6" },
    { id: "task-loop", label: "Task Loop", shortcut: "7" },
  ];

  return (
    <Box
      borderStyle="single"
      flexDirection="column"
      height="100%"
      width={20}
    >
      {/* Logo/Header */}
      <Box borderStyle={undefined} paddingX={1} paddingY={1}>
        <Text bold color={colors.primary}>
          OPENFARM
        </Text>
      </Box>

      {/* Main Navigation */}
      <Box flexDirection="column" flexGrow={1}>
        <SectionHeader title="Navigation" />
        {sections.map((section) => (
          <NavItem
            id={section.id}
            isActive={activeSection === section.id}
            key={section.id}
            label={section.label}
            onPress={() => onSectionChange(section.id)}
            shortcut={section.shortcut}
          />
        ))}
      </Box>

      {/* Keyboard Help */}
      <Box borderStyle="single" flexDirection="column" margin={1} paddingX={1}>
        <Text color={colors.secondary} dimColor>
          Shortcuts:
        </Text>
        <Text color={colors.muted} dimColor>
          ↑↓ navigate
        </Text>
        <Text color={colors.muted} dimColor>
          Enter select
        </Text>
        <Text color={colors.muted} dimColor>
          q quit
        </Text>
      </Box>
    </Box>
  );
}
