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
import React from "react";
import { Footer } from "./footer";
import { Header } from "./header";
import { TabBar, type Tab } from "../tabs/tab-bar";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  status?: "idle" | "running" | "paused" | "error";
  sessionId?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  footerMessage?: string;
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
}: MainLayoutProps) {
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header title={title} status={status} sessionId={sessionId} />

      {/* Tab Bar */}
      <Box paddingX={1}>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      </Box>

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="row">
        {children}
      </Box>

      {/* Footer */}
      <Footer message={footerMessage} />
    </Box>
  );
}
