#!/usr/bin/env node
/**
 * OpenFarm TUI v2 Demo
 *
 * Demonstrates the new Ralph TUI-style dashboard with:
 * - Dashboard layout with tabs
 * - Subagent tracing panel
 * - Remote instance tabs
 */

import { Box, render, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { MainLayout } from "./components/layout";
import { RemoteTabs } from "./components/remote-tabs";
import { TraceTree } from "./components/trace-tree";
import { useTracing } from "./hooks/use-tracing";
import { NewDashboard } from "./screens/new-dashboard";
import { useRemoteStore } from "./store/remote-store";
import { useTracingStore } from "./store/tracing-store";

const TABS = [
  { id: "dashboard", label: "Dashboard", shortcut: "1" },
  { id: "tracing", label: "Tracing", shortcut: "2" },
  { id: "remotes", label: "Remotes", shortcut: "3" },
];

function DemoTracing() {
  const { startTrace, completeTrace, tree } = useTracing({
    sessionId: "demo-session",
    autoInit: true,
  });

  // Simulate traces
  useEffect(() => {
    if (!tree || tree.roots.length > 0) {
      return;
    }

    const runDemo = async () => {
      // Root trace
      const rootId = startTrace(
        undefined,
        "analyze-codebase",
        "🔍",
        "Find auth bugs"
      );

      await new Promise((r) => setTimeout(r, 800));
      const child1 = startTrace(
        rootId,
        "search-files",
        "📁",
        "Search for auth patterns"
      );

      await new Promise((r) => setTimeout(r, 1200));
      completeTrace(
        child1,
        "Found 3 matches in src/auth.ts, src/middleware.ts"
      );

      await new Promise((r) => setTimeout(r, 500));
      const child2 = startTrace(
        rootId,
        "read-file",
        "📄",
        "Analyze src/auth.ts"
      );

      await new Promise((r) => setTimeout(r, 1500));
      completeTrace(child2, "Found vulnerability in JWT validation");

      await new Promise((r) => setTimeout(r, 600));
      const child3 = startTrace(
        rootId,
        "generate-fix",
        "🔧",
        "Create patch for JWT validation"
      );

      await new Promise((r) => setTimeout(r, 2000));
      completeTrace(child3, "Generated fix with tests");

      completeTrace(
        rootId,
        "Analysis complete. Found 1 vulnerability, generated fix."
      );
    };

    runDemo();
  }, [tree, startTrace, completeTrace]);

  return (
    <Box flexDirection="row" flexGrow={1} gap={1}>
      <Box width="50%">
        <TraceTree height={20} width="100%" />
      </Box>
      <Box borderColor="gray" borderStyle="single" padding={1} width="50%">
        <Text bold>Trace Details</Text>
        <Text color="gray" dimColor>
          Select a trace to see details
        </Text>
      </Box>
    </Box>
  );
}

function DemoRemotes() {
  const { instances, addInstance, connect } = useRemoteStore();
  const [activeTab, setActiveTab] = useState("local");

  // Add demo instances
  useEffect(() => {
    if (instances.length === 0) {
      addInstance({
        id: "prod",
        name: "prod",
        url: "wss://prod.example.com:8080",
      });
      addInstance({
        id: "staging",
        name: "staging",
        url: "wss://staging.example.com:8080",
      });
      addInstance({
        id: "dev",
        name: "dev",
        url: "wss://dev.example.com:8080",
      });

      // Simulate connecting to prod
      setTimeout(() => {
        connect("prod").catch(() => {});
      }, 1000);
    }
  }, [instances.length, addInstance, connect]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <RemoteTabs
        activeTab={activeTab}
        onAddRemote={() => console.log("Add remote")}
        onTabChange={setActiveTab}
        showAddButton={true}
      />
      <Box flexGrow={1} padding={1}>
        {activeTab === "local" ? (
          <Text>Local instance - Active</Text>
        ) : (
          <Text>Remote instance: {activeTab}</Text>
        )}
      </Box>
    </Box>
  );
}

function DemoApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [_showTracing, _setShowTracing] = useState(false);
  const { isVisible, toggleVisibility } = useTracingStore();

  useInput((input, key) => {
    if (input === "T") {
      toggleVisibility();
    }
    if (input === "q" || (key.ctrl && input === "c")) {
      process.exit(0);
    }
  });

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Box flexDirection="row" flexGrow={1}>
            <Box width={isVisible ? "50%" : "100%"}>
              <NewDashboard />
            </Box>
            {isVisible && (
              <Box width="50%">
                <TraceTree height={20} width="100%" />
              </Box>
            )}
          </Box>
        );
      case "tracing":
        return <DemoTracing />;
      case "remotes":
        return <DemoRemotes />;
      default:
        return <NewDashboard />;
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      footerMessage={
        isVisible
          ? "Tracing visible - Press [T] to hide"
          : "Press [T] for tracing"
      }
      onTabChange={setActiveTab}
      sessionId="demo-session-123"
      status="running"
      tabs={TABS}
      title="OpenFarm v2"
    >
      {renderContent()}
    </MainLayout>
  );
}

// Run demo
console.log("Starting OpenFarm TUI v2 Demo...");
console.log("Press [T] to toggle tracing panel");
console.log("Press [1-3] to switch tabs");
console.log("Press [q] or Ctrl+C to quit");
console.log("");

const { waitUntilExit } = render(<DemoApp />);
waitUntilExit();
