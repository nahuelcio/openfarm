import React, { useEffect } from "react";
import { useRenderer } from "@opentui/react";
import { Layout } from "./components/layout";
import { Dashboard } from "./screens/Dashboard";
import { Execute } from "./screens/Execute";
import { Executing } from "./screens/Executing";
import { History } from "./screens/History";
import { ExecutionDetail } from "./screens/ExecutionDetail";
import { Settings } from "./screens/Settings";
import { useAppStore } from "./store";
import type { OpenFarmConfig } from "../types";

interface AppProps {
  config: OpenFarmConfig;
}

export function App({ config }: AppProps) {
  const { currentScreen, setConfig, setScreen } = useAppStore();
  const renderer = useRenderer();

  // Setup config
  useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);

  // Use renderer's keyInput for responsive keyboard handling
  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
      // Immediate navigation without delays
      if (event.ctrl) {
        switch (event.name.toLowerCase()) {
          case "n":
            setScreen("execute");
            return;
          case "h":
            setScreen("history");
            return;
          case "s":
            setScreen("settings");
            return;
          case "d":
            setScreen("dashboard");
            return;
          case "q":
            process.exit(0);
            return;
        }
      }
      
      // Escape to go back
      if (event.name === "escape") {
        setScreen("dashboard");
      }
    };

    renderer.keyInput.on("key", handleKey);
    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, setScreen]);

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
