/**
 * MainLayout Component
 *
 * Ralph TUI-style dashboard layout with:
 * - Header with status
 * - Tab bar for navigation
 * - Main content area
 * - Footer with shortcuts
 */

import { Box } from "ink";
import type React from "react";
import { type Tab, TabBar } from "../tabs/tab-bar";
import { Footer } from "./footer";
import { Header } from "./header";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  status?: "idle" | "running" | "paused" | "error";
  sessionId?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  footerMessage?: string;
  tabHotkeysEnabled?: boolean;
}

export function MainLayout({
  children,
  title,
  status,
  sessionId,
  tabs,
  activeTab,
  onTabChange,
  footerMessage,
  tabHotkeysEnabled = true,
}: MainLayoutProps) {
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header sessionId={sessionId} status={status} title={title} />

      {/* Tab Bar */}
      <Box paddingX={1}>
        <TabBar
          activeTab={activeTab}
          hotkeysEnabled={tabHotkeysEnabled}
          onTabChange={onTabChange}
          tabs={tabs}
        />
      </Box>

      {/* Main Content */}
      <Box flexDirection="row" flexGrow={1}>
        {children}
      </Box>

      {/* Footer */}
      <Footer message={footerMessage} />
    </Box>
  );
}
