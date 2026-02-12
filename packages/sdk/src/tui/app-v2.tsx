import { useEffect, useMemo, useState } from "react";
import type { SectionId } from "./components/layout";
import { MainLayout } from "./components/layout";
import { ImprovedSidebar } from "./components/layout/improved-sidebar";
import { SplashScreen } from "./components/splash-screen";
import type { Tab } from "./components/tabs";
import { useInitialization } from "./hooks/use-initialization";
import { AgentChat } from "./screens/agent-chat";
import { FileExplorer } from "./screens/file-explorer";
import { WarpTerminal } from "./screens/warp-terminal";
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
import { type Screen, type TabId, useStore } from "./store";
import { useExecutionRuntimeStore } from "./store/execution-runtime-store";

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard", shortcut: "1" },
  { id: "execute", label: "Execute", shortcut: "2" },
  { id: "history", label: "History", shortcut: "3" },
  { id: "workflows", label: "Workflows", shortcut: "4" },
  { id: "context", label: "Context", shortcut: "5" },
  { id: "remotes", label: "Remotes", shortcut: "6" },
  { id: "task-loop", label: "Loop", shortcut: "7" },
];

const SECTION_SCREEN_MAP: Record<SectionId, Screen> = {
  dashboard: "dashboard",
  execute: "execute",
  history: "history",
  workflows: "workflows",
  context: "context-config",
  remotes: "remotes",
  "task-loop": "task-loop",
  "agent-chat": "agent-chat",
};

function resolveSection(screen: Screen): SectionId {
  if (screen === "running" || screen === "execute") {
    return "execute";
  }
  if (
    screen === "history" ||
    screen === "execution-detail" ||
    screen === "diff-viewer"
  ) {
    return "history";
  }
  if (screen === "workflows" || screen === "workflow-editor") {
    return "workflows";
  }
  if (
    screen === "context" ||
    screen === "context-config" ||
    screen === "context-history"
  ) {
    return "context";
  }
  if (screen === "remotes" || screen === "remote-instance") {
    return "remotes";
  }
  if (screen === "task-loop") {
    return "task-loop";
  }
  return "dashboard";
}

function getShortcuts(section: SectionId, screen: Screen) {
  const base = [
    { key: "↑↓", label: "navigate" },
    { key: "Enter", label: "open" },
    { key: "[ ]", label: "section" },
    { key: "Tab", label: "compact view" },
    { key: "Esc", label: "back" },
  ];

  if (section === "execute") {
    return [
      ...base,
      { key: "s", label: "start" },
      { key: "p", label: "pause" },
      { key: "d", label: "dashboard" },
    ];
  }

  if (section === "history") {
    return [...base, { key: "d", label: "diff" }, { key: "r", label: "rerun" }];
  }

  if (section === "workflows") {
    return [
      ...base,
      { key: "a", label: "add step" },
      { key: "s", label: "save" },
    ];
  }

  if (section === "task-loop" || screen === "task-loop") {
    return [
      ...base,
      { key: "o", label: "panel" },
      { key: "v", label: "mode" },
      { key: "q", label: "quit loop" },
    ];
  }

  return base;
}

export function AppV2() {
  const {
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    currentExecution,
    provider,
  } = useStore();
  const [showSplash, setShowSplash] = useState(true);
  const {
    isReady,
    progress,
    status: loadingStatus,
  } = useInitialization(provider);

  const currentSection = useMemo(() => resolveSection(screen), [screen]);

  // Sync tab with current section
  useEffect(() => {
    if (activeTab !== currentSection) {
      setActiveTab(currentSection as TabId);
    }
  }, [activeTab, currentSection, setActiveTab]);

  const hasActiveSession = useExecutionRuntimeStore((s) =>
    s.hasActiveSession()
  );

  const executionStatus = useMemo(() => {
    // Runtime store is the source of truth for active executions
    if (hasActiveSession) {
      return "running" as const;
    }
    if (!currentExecution) {
      return "idle" as const;
    }
    if (currentExecution.status === "running") {
      return "running" as const;
    }
    if (currentExecution.status === "cancelled") {
      return "paused" as const;
    }
    if (currentExecution.status === "failed") {
      return "error" as const;
    }
    return "idle" as const;
  }, [currentExecution, hasActiveSession]);

  const handleTabChange = (tabId: string) => {
    const section = tabId as SectionId;
    const targetScreen = SECTION_SCREEN_MAP[section];
    if (!targetScreen) {
      return;
    }
    setActiveTab(section as TabId);
    setScreen(targetScreen);
  };

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
      case "remote-instance":
        return <RemoteInstancesScreen />;
      case "theme-selector":
        return <ThemeSelector />;
      case "task-loop":
        return <TaskLoopScreen embedded={true} />;
      case "agent-chat":
        return <AgentChat />;
      case "file-explorer":
        return <FileExplorer />;
      case "warp-terminal":
        return <WarpTerminal />;
      default:
        return <NewDashboard />;
    }
  };

  // Show splash screen while loading (must be after all hooks)
  if (showSplash && !isReady) {
    return (
      <SplashScreen
        loadingProgress={progress}
        loadingText={loadingStatus}
        onReady={() => setShowSplash(false)}
      />
    );
  }

  return (
    <MainLayout
      activeTab={currentSection}
      footerMessage={
        currentExecution ? `Task: ${currentExecution.task}` : "Ready"
      }
      footerShortcuts={getShortcuts(currentSection, screen)}
      leftPanel={
        <ImprovedSidebar
          activeSection={currentSection}
          onSectionChange={(section) => {
            const targetScreen = SECTION_SCREEN_MAP[section];
            if (targetScreen) {
              setScreen(targetScreen);
            }
          }}
        />
      }
      onTabChange={handleTabChange}
      sessionId={currentExecution?.id}
      status={executionStatus}
      tabHotkeysEnabled={screen !== "execute"}
      tabs={TABS}
      title="OpenFarm"
    >
      {renderContent()}
    </MainLayout>
  );
}
