import React from "react";
import { Layout } from "./components/layout";
import { Dashboard } from "./screens/Dashboard";
import { Execute } from "./screens/Execute";
import { Executing } from "./screens/Executing";
import { History } from "./screens/History";
import { ExecutionDetail } from "./screens/ExecutionDetail";
import { Settings } from "./screens/Settings";
import { useAppStore } from "./store";
import { useAppShortcuts } from "./hooks/useKeyboard";
import type { OpenFarmConfig } from "../types";

interface AppProps {
  config: OpenFarmConfig;
}

export function App({ config }: AppProps) {
  const { currentScreen, setConfig } = useAppStore();

  // Setup keyboard shortcuts
  useAppShortcuts();

  // Set config on mount
  React.useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <Dashboard />;
      case "execute":
        return <Execute />;
      case "executing":
        return <Executing />;
      case "history":
        return <History />;
      case "execution-detail":
        return <ExecutionDetail />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderScreen()}</Layout>;
}
