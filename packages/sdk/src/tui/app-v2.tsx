/**
 * App v2 - Ralph TUI-style Dashboard Layout with Remote Instances
 *
 * Features:
 * - Header with status
 * - Tab bar for local + remote navigation
 * - Main content area
 * - Footer with shortcuts
 */

import { Box } from "@openfarm/tui-opentui";
import { useState } from "react";
import { MainLayout } from "./components/layout";
import { RemoteTabs } from "./components/remote-tabs";
import type { Tab } from "./components/tabs";
import { ContextScreen } from "./screens/context";
import { ContextConfigScreen } from "./screens/context-config";
import { ContextHistoryScreen } from "./screens/context-history";
import { DiffViewer } from "./screens/diff-viewer";
import { Execute } from "./screens/execute";
import { ExecutionDetail } from "./screens/execution-detail";
import { History } from "./screens/history";
import { NewDashboard } from "./screens/new-dashboard";
import { RemoteInstancesScreen } from "./screens/remote-instances";
import { Running } from "./screens/running";
import { TaskLoopScreen } from "./screens/task-loop";
import { ThemeSelector } from "./screens/theme-selector";
import { WorkflowEditor } from "./screens/workflow-editor";
import { WorkflowList } from "./screens/workflow-list";
import { type TabId, useStore } from "./store";

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard", shortcut: "1" },
  { id: "execute", label: "Execute", shortcut: "2" },
  { id: "history", label: "History", shortcut: "3" },
  { id: "workflows", label: "Workflows", shortcut: "4" },
  { id: "context", label: "Context", shortcut: "5" },
  { id: "remotes", label: "Remotes", shortcut: "6" },
];

const TAB_SCREEN_MAP: Record<string, string> = {
  dashboard: "dashboard",
  execute: "execute",
  history: "history",
  workflows: "workflows",
  context: "context-config", // Start with config to select provider/model
  remotes: "remotes",
};

export function AppV2() {
  const { screen, setScreen, activeTab, setActiveTab, currentExecution } =
    useStore();
  const [activeRemoteTab, setActiveRemoteTab] = useState("local");
  const [_showAddRemote, setShowAddRemote] = useState(false);

  // Determine status based on current execution
  const getStatus = () => {
    if (!currentExecution) {
      return "idle";
    }
    if (currentExecution.status === "running") {
      return "running";
    }
    if (currentExecution.status === "cancelled") {
      return "paused";
    }
    if (currentExecution.status === "failed") {
      return "error";
    }
    return "idle";
  };

  // Handle tab change (local tabs)
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId);
    setScreen(TAB_SCREEN_MAP[tabId] as any);
    setActiveRemoteTab("local");
  };

  // Handle remote tab change
  const handleRemoteTabChange = (tabId: string) => {
    setActiveRemoteTab(tabId);
    if (tabId === "local") {
      setActiveTab("dashboard");
      setScreen("dashboard");
    } else {
      setScreen("remote-instance");
    }
  };

  if (screen === "task-loop") {
    return <TaskLoopScreen />;
  }

  // Render content based on screen
  const renderContent = () => {
    switch (screen) {
      case "dashboard":
        return <NewDashboard />;
      case "execute":
        return <Execute />;
      case "running":
        return <Running />;
      case "history":
        return <History />;
      case "diff-viewer":
        return <DiffViewer />;
      case "execution-detail":
        return <ExecutionDetail />;
      case "workflows":
        return <WorkflowList />;
      case "workflow-editor":
        return <WorkflowEditor />;
      case "context-config":
        return <ContextConfigScreen />;
      case "context":
        return <ContextScreen />;
      case "context-history":
        return <ContextHistoryScreen />;
      case "remotes":
        return <RemoteInstancesScreen />;
      case "theme-selector":
        return <ThemeSelector />;
      default:
        return <NewDashboard />;
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      footerMessage={
        currentExecution ? `Task: ${currentExecution.task}` : "Ready"
      }
      onTabChange={handleTabChange}
      sessionId={currentExecution?.id}
      status={getStatus()}
      tabHotkeysEnabled={screen !== "execute"}
      tabs={TABS}
      title="OpenFarm"
    >
      <Box flexDirection="column" flexGrow={1}>
        {/* Remote Instance Tabs (shown on all screens) */}
        <RemoteTabs
          activeTab={activeRemoteTab}
          onAddRemote={() => setShowAddRemote(true)}
          onTabChange={handleRemoteTabChange}
          showAddButton={true}
        />

        {/* Main Content */}
        <Box flexDirection="column" flexGrow={1}>
          {renderContent()}
        </Box>
      </Box>
    </MainLayout>
  );
}
