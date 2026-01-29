// Keyboard shortcuts for OpenTUI
// Uses OpenTUI's built-in keyboard handling via renderer.keyInput

import { useEffect } from "react";
import { useRenderer } from "@opentui/react";
import { useAppStore } from "../store";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  handler: () => void;
}

export function useKeyboard(shortcuts: ShortcutConfig[]) {
  const renderer = useRenderer();

  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.name.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === event.ctrl;

        if (keyMatch && ctrlMatch) {
          shortcut.handler();
          return;
        }
      }
    };

    // Add keyboard listener through renderer
    renderer.keyInput.on("key", handleKey);

    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, shortcuts]);
}

// Predefined shortcuts for the app
export function useAppShortcuts() {
  const { setScreen } = useAppStore();
  const renderer = useRenderer();

  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
      // Ctrl+N - New Task
      if (event.ctrl && event.name === "n") {
        setScreen("execute");
        return;
      }
      // Ctrl+H - History
      if (event.ctrl && event.name === "h") {
        setScreen("history");
        return;
      }
      // Ctrl+S - Settings
      if (event.ctrl && event.name === "s") {
        setScreen("settings");
        return;
      }
      // Ctrl+D - Dashboard
      if (event.ctrl && event.name === "d") {
        setScreen("dashboard");
        return;
      }
      // Ctrl+Q or Escape - Quit
      if ((event.ctrl && event.name === "q") || event.name === "escape") {
        process.exit(0);
      }
    };

    renderer.keyInput.on("key", handleKey);

    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, setScreen]);
}
