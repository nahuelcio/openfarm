// Keyboard shortcuts for OpenTUI - Optimized for responsiveness
import { useEffect, useRef } from "react";
import { useRenderer } from "@opentui/react";
import { useAppStore } from "../store";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
}

export function useKeyboard(shortcuts: ShortcutConfig[]) {
  const renderer = useRenderer();
  const lastKeyTime = useRef<number>(0);
  const DEBOUNCE_MS = 50;

  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean; alt?: boolean; shift?: boolean }) => {
      const now = Date.now();
      if (now - lastKeyTime.current < DEBOUNCE_MS) return;
      
      for (const shortcut of shortcuts) {
        const keyMatch = event.name.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === event.ctrl;
        const altMatch = !!shortcut.alt === event.alt;
        const shiftMatch = !!shortcut.shift === event.shift;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          lastKeyTime.current = now;
          shortcut.handler();
          return;
        }
      }
    };

    renderer.keyInput.on("key", handleKey);
    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, shortcuts]);
}

export function useAppShortcuts() {
  const { setScreen } = useAppStore();
  const renderer = useRenderer();

  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
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
      
      if (event.name === "escape") {
        setScreen("dashboard");
      }
    };

    renderer.keyInput.on("key", handleKey);
    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, setScreen]);
}
