import { useEffect, useCallback } from "react";

export interface InputKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  pageUp: boolean;
  pageDown: boolean;
  home: boolean;
  end: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

const KEY_MAP: Record<string, keyof InputKey> = {
  ArrowUp: "upArrow",
  ArrowDown: "downArrow",
  ArrowLeft: "leftArrow",
  ArrowRight: "rightArrow",
  Enter: "return",
  Escape: "escape",
  Tab: "tab",
  Backspace: "backspace",
  Delete: "delete",
  PageUp: "pageUp",
  PageDown: "pageDown",
  Home: "home",
  End: "end",
};

function parseKeyEvent(event: KeyboardEvent): { input: string; key: InputKey } {
  const key: InputKey = {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    return: false,
    escape: false,
    tab: false,
    backspace: false,
    delete: false,
    pageUp: false,
    pageDown: false,
    home: false,
    end: false,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };

  // Mapear teclas especiales
  const mappedKey = KEY_MAP[event.key];
  if (mappedKey) {
    key[mappedKey] = true;
  }

  // Determinar input string
  let input = "";
  if (event.key.length === 1) {
    input = event.key;
  } else if (event.key === "Enter") {
    input = "\r";
  } else if (event.key === "Tab") {
    input = "\t";
  } else if (event.key === "Backspace") {
    input = "\b";
  } else if (event.key === "Escape") {
    input = "\x1b";
  }

  return { input, key };
}

export function useKeyboard(
  handler: (key: {
    name?: string;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
    sequence?: string;
  }) => void,
  options?: { isActive?: boolean }
): void {
  const active = options?.isActive ?? true;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active) return;

      handler({
        name: event.key.toLowerCase(),
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        meta: event.metaKey,
        sequence: event.key.length === 1 ? event.key : undefined,
      });
    },
    [handler, active]
  );

  useEffect(() => {
    if (!active) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, active]);
}

export function useInput(
  handler: (input: string, key: InputKey) => void,
  options?: { isActive?: boolean }
): void {
  const active = options?.isActive ?? true;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active) return;

      const { input, key } = parseKeyEvent(event);
      handler(input, key);
    },
    [handler, active]
  );

  useEffect(() => {
    if (!active) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, active]);
}
