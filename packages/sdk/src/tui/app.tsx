import { useEffect, useMemo, useState } from "react";
import type { SectionId } from "./components/layout";
import { MainLayout } from "./components/layout";
import { ImprovedSidebar } from "./components/layout/improved-sidebar";
import { SplashScreen } from "./components/splash-screen";
import { useInitialization } from "./hooks/use-initialization";
import { Dashboard } from "./screens/dashboard";
import { ExecuteScreen } from "./screens/execute";
import { History } from "./screens/history";
import { MultiAgentDashboard } from "./screens/multi-agent-dashboard";
import { Running } from "./screens/running";
import { type Screen, type TabId, useStore } from "./store";
import { useExecutionRuntimeStore } from "./store/execution-runtime-store";

const TABS = [
  { id: "dashboard", label: "🏠 Home", shortcut: "1" },
  { id: "execute", label: "⚡ Execute", shortcut: "2" },
  { id: "multi-agents", label: "🤖 Agents", shortcut: "3" },
  { id: "history", label: "📜 History", shortcut: "4" },
];

const SECTION_SCREEN_MAP: Record<SectionId, Screen> = {
  dashboard: "dashboard",
  execute: "execute",
  "multi-agents": "multi-agent-dashboard",
  history: "history",
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
  if (screen === "multi-agent-dashboard") {
    return "multi-agents";
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

  if (section === "multi-agents") {
    return [
      ...base,
      { key: "n", label: "new agent" },
      { key: "r", label: "review" },
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
      case "execute":
        return <ExecuteScreen />;
      case "running":
        return <Running />;
      case "history":
      case "diff-viewer":
      case "execution-detail":
        return <History />;
      case "multi-agent-dashboard":
        return <MultiAgentDashboard />;
      default:
        return <Dashboard />;
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
