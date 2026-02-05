/**
 * MainLayout Component
 *
 * Terminal shell with:
 * - lateral navigation
 * - contextual side panel
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
import { useMemo, useState } from "react";
import type { Tab } from "../tabs/tab-bar";
import { Footer } from "./footer";
import { getLayoutMode } from "./layout-mode";
import { SideNav } from "./side-nav";

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
  const [singleView, setSingleView] = useState<"navigation" | "content">(
    "content"
  );
  const badge = getStatusBadge(status ?? "idle");

  useInput((_, key) => {
    if (layoutMode === "single" && key.tab) {
      setSingleView((value) =>
        value === "content" ? "navigation" : "content"
      );
    }
  });

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

  const leftShellPanel = (
    <Box
      borderStyle="single"
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
    >
      {leftPanel}
    </Box>
  );

  const contentShellPanel = (
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
        {layoutMode === "triple" ? (
          <>
            <SideNav
              activeTab={activeTab}
              mode="vertical"
              onTabChange={onTabChange}
              tabs={tabs}
            />
            <Box flexDirection="column" marginLeft={1} width="34%">
              {leftShellPanel}
            </Box>
            <Box flexDirection="column" flexGrow={1} marginLeft={1}>
              {contentShellPanel}
            </Box>
          </>
        ) : null}

        {layoutMode === "dual" ? (
          <Box flexDirection="column" flexGrow={1}>
            <SideNav
              activeTab={activeTab}
              mode="horizontal"
              onTabChange={onTabChange}
              tabs={tabs}
            />
            <Box flexDirection="row" flexGrow={1} marginTop={1}>
              <Box flexDirection="column" width="36%">
                {leftShellPanel}
              </Box>
              <Box flexDirection="column" flexGrow={1} marginLeft={1}>
                {contentShellPanel}
              </Box>
            </Box>
          </Box>
        ) : null}

        {layoutMode === "single" ? (
          <Box flexDirection="column" flexGrow={1}>
            <Box
              borderStyle="single"
              flexDirection="row"
              justifyContent="space-between"
              paddingX={1}
            >
              <Text>Tab = switch view</Text>
              <Text>
                {singleView === "navigation" ? "navigation" : "content"}
              </Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} marginTop={1}>
              {singleView === "navigation" ? (
                <Box flexDirection="column" flexGrow={1} gap={1}>
                  <SideNav
                    activeTab={activeTab}
                    mode="horizontal"
                    onTabChange={onTabChange}
                    tabs={tabs}
                  />
                  {leftShellPanel}
                </Box>
              ) : (
                contentShellPanel
              )}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Footer message={footerMessage} shortcuts={footerShortcuts} />
    </Box>
  );
}
