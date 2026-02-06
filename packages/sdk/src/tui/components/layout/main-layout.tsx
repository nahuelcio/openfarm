/**
 * MainLayout Component
 *
 * Terminal shell with:
 * - lateral navigation (improved sidebar)
 * - content panel
 * - adaptive layout for narrow terminals
 */

import {
  Box,
  Text,
  useInput,
  useStdoutDimensions,
} from "@openfarm/tui-opentui";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { Tab } from "../tabs/tab-bar";
import { Footer } from "./footer";
import { getLayoutMode } from "./layout-mode";

interface MainLayoutProps {
  children: ReactNode;
  leftPanel: ReactNode;
  title?: string;
  status?: "idle" | "running" | "paused" | "error";
  sessionId?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  footerMessage?: string;
  footerShortcuts?: Array<{ key: string; label: string }>;
  tabHotkeysEnabled?: boolean;
}

function getStatusBadge(status: "idle" | "running" | "paused" | "error") {
  if (status === "running") {
    return { icon: "●", label: "running" };
  }
  if (status === "paused") {
    return { icon: "◐", label: "paused" };
  }
  if (status === "error") {
    return { icon: "✕", label: "error" };
  }
  return { icon: "○", label: "idle" };
}

export function MainLayout({
  children,
  leftPanel,
  title,
  status,
  sessionId,
  tabs,
  activeTab,
  onTabChange,
  footerMessage,
  footerShortcuts,
  tabHotkeysEnabled = true,
}: MainLayoutProps) {
  const { columns } = useStdoutDimensions();
  const layoutMode = useMemo(() => getLayoutMode(columns), [columns]);
  const badge = getStatusBadge(status ?? "idle");

  useInput((input) => {
    if (!tabHotkeysEnabled) {
      return;
    }

    if (input === "[") {
      const current = tabs.findIndex((tab) => tab.id === activeTab);
      const next = current > 0 ? current - 1 : tabs.length - 1;
      const target = tabs[next];
      if (target) {
        onTabChange(target.id);
      }
      return;
    }

    if (input === "]") {
      const current = tabs.findIndex((tab) => tab.id === activeTab);
      const next = current < tabs.length - 1 ? current + 1 : 0;
      const target = tabs[next];
      if (target) {
        onTabChange(target.id);
      }
      return;
    }

    const index = Number.parseInt(input, 10);
    if (Number.isNaN(index)) {
      return;
    }
    const target = tabs[index - 1];
    if (target) {
      onTabChange(target.id);
    }
  });

  const shellTitle = title || "OpenFarm";

  const header = (
    <Box
      borderStyle="single"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
    >
      <Text bold>
        {shellTitle}
        {sessionId ? ` · ${sessionId.slice(0, 8)}` : ""}
      </Text>
      <Text>
        {badge.icon} {badge.label}
      </Text>
    </Box>
  );

  const contentPanel = (
    <Box
      borderStyle="single"
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
    >
      <Box flexDirection="column" flexGrow={1} padding={1}>
        {children}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" height="100%">
      {header}

      <Box flexDirection="row" flexGrow={1} padding={1}>
        {layoutMode === "triple" || layoutMode === "dual" ? (
          <>
            {/* Improved Sidebar - always visible */}
            <Box flexDirection="column" width={22}>
              {leftPanel}
            </Box>
            {/* Content */}
            <Box flexDirection="column" flexGrow={1} marginLeft={1}>
              {contentPanel}
            </Box>
          </>
        ) : null}

        {layoutMode === "single" ? (
          <Box flexDirection="column" flexGrow={1}>
            <Box
              borderStyle="single"
              flexDirection="row"
              justifyContent="space-between"
              paddingX={1}
            >
              <Text>Narrow mode - use 1-8 for navigation</Text>
              <Text>{badge.label}</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} marginTop={1}>
              {contentPanel}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Footer message={footerMessage} shortcuts={footerShortcuts} />
    </Box>
  );
}
