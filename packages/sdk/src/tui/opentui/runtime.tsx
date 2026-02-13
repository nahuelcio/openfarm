import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import type React from "react";
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

type BorderStyle = "single" | "double" | "round" | "bold";

interface TuiMouseEvent {
  x: number;
  y: number;
  button: number;
  type: string;
  stopPropagation?: () => void;
  preventDefault?: () => void;
}

const mapBorderStyle = (
  style?: BorderStyle
): "single" | "double" | "rounded" | "bold" => {
  if (style === "double") {
    return "double";
  }
  if (style === "round") {
    return "rounded";
  }
  if (style === "bold") {
    return "bold";
  }
  return "single";
};

/** Props for the OpenTUI box element */
interface OpenTuiBoxProps {
  border?: boolean;
  borderStyle?: "single" | "double" | "rounded" | "bold";
  borderColor?: string;
  padding?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  margin?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  flexDirection?: "row" | "column";
  flexGrow?: number;
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: number;
  width?: number | string;
  height?: number | string;
  overflow?: "hidden" | "visible";
  title?: string;
  onMouse?: (event: TuiMouseEvent) => void;
  onMouseDown?: (event: TuiMouseEvent) => void;
  onMouseUp?: (event: TuiMouseEvent) => void;
  onMouseMove?: (event: TuiMouseEvent) => void;
  [key: string]: unknown;
}

type BoxLikeProps = PropsWithChildren<{
  border?: boolean;
  borderStyle?: BorderStyle;
  borderColor?: string;
  flexDirection?: "row" | "column";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: number;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  margin?: number;
  marginX?: number;
  marginY?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  width?: number | string;
  height?: number | string;
  flexGrow?: number;
  overflow?: "hidden" | "visible";
  title?: string;
  onMouse?: (event: TuiMouseEvent) => void;
  onMouseDown?: (event: TuiMouseEvent) => void;
  onMouseUp?: (event: TuiMouseEvent) => void;
  onMouseMove?: (event: TuiMouseEvent) => void;
  [key: string]: unknown;
}>;

export type BoxProps = BoxLikeProps;

export function Box({
  children,
  border,
  borderStyle,
  borderColor,
  padding,
  paddingX,
  paddingY,
  margin,
  marginX,
  marginY,
  ...rest
}: BoxLikeProps) {
  const showBorder = border ?? borderStyle !== undefined;
  const props: OpenTuiBoxProps = {
    ...rest,
    border: showBorder,
    borderStyle: showBorder ? mapBorderStyle(borderStyle) : undefined,
    borderColor,
    padding,
    paddingLeft: paddingX ?? (rest.paddingLeft as number | undefined),
    paddingRight: paddingX ?? (rest.paddingRight as number | undefined),
    paddingTop: paddingY ?? (rest.paddingTop as number | undefined),
    paddingBottom: paddingY ?? (rest.paddingBottom as number | undefined),
    margin,
    marginLeft: marginX ?? (rest.marginLeft as number | undefined),
    marginRight: marginX ?? (rest.marginRight as number | undefined),
    marginTop: marginY ?? (rest.marginTop as number | undefined),
    marginBottom: marginY ?? (rest.marginBottom as number | undefined),
  };
  return createElement("box", props, children);
}

/** Props for the OpenTUI text/span elements */
interface OpenTuiTextProps {
  fg?: string;
  opacity?: number;
  [key: string]: unknown;
}

type TextProps = PropsWithChildren<{
  color?: string;
  bold?: boolean;
  underline?: boolean;
  dimColor?: boolean;
  wrap?: "wrap" | "truncate-end";
  [key: string]: unknown;
}>;

export function Text({
  children,
  color,
  bold,
  underline,
  dimColor,
  ...rest
}: TextProps) {
  const isNestedText = useContext(TextNestingContext);
  const TextNode = isNestedText ? "span" : "text";

  const content = bold
    ? createElement("strong", null, children)
    : underline
      ? createElement("u", null, children)
      : children;

  const textProps: OpenTuiTextProps = {
    ...rest,
    fg: color,
    opacity: dimColor ? 0.65 : (rest.opacity as number | undefined),
  };

  const base = createElement(
    TextNode,
    textProps,
    createElement(TextNestingContext.Provider, { value: true }, content)
  );

  return base;
}

interface InputKey {
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

// Type for the key event from useKeyboard
type KeyboardKeyEvent = Parameters<Parameters<typeof useKeyboard>[0]>[0];

const toInputKey = (key: KeyboardKeyEvent): InputKey => ({
  upArrow: key.name === "up",
  downArrow: key.name === "down",
  leftArrow: key.name === "left",
  rightArrow: key.name === "right",
  return: key.name === "enter" || key.name === "return",
  escape: key.name === "escape",
  tab: key.name === "tab",
  backspace: key.name === "backspace",
  delete: key.name === "delete",
  pageUp: key.name === "pageup",
  pageDown: key.name === "pagedown",
  home: key.name === "home",
  end: key.name === "end",
  ctrl: Boolean(key.ctrl),
  shift: Boolean(key.shift),
  meta: Boolean(key.meta),
});

const toInput = (key: KeyboardKeyEvent): string => {
  if (typeof key.sequence === "string" && key.sequence.length === 1) {
    return key.sequence;
  }
  if (typeof key.name === "string" && key.name.length === 1) {
    return key.name;
  }
  return "";
};

export function useInput(
  handler: (input: string, key: InputKey) => void,
  options?: { isActive?: boolean }
): void {
  const active = options?.isActive ?? true;
  useKeyboard((key) => {
    if (!active) {
      return;
    }
    handler(toInput(key), toInputKey(key));
  });
}

export function useApp(): { exit: (error?: Error) => void } {
  return {
    exit: (error?: Error) => {
      if (error) {
        console.error(error);
      }
      currentRenderer?.destroy();
    },
  };
}

export function useStdout(): { stdout: NodeJS.WriteStream } {
  return { stdout: process.stdout };
}

export function useStdoutDimensions(): { rows: number; columns: number } {
  const [dims, setDims] = useState({
    rows: process.stdout.rows || 24,
    columns: process.stdout.columns || 80,
  });

  useEffect(() => {
    const onResize = () => {
      setDims({
        rows: process.stdout.rows || 24,
        columns: process.stdout.columns || 80,
      });
    };
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return dims;
}

export function useStdin(): { isRawModeSupported: boolean } {
  return { isRawModeSupported: true };
}

export function render(node: React.ReactNode) {
  let destroyed = false;
  let rootRef: ReturnType<typeof createRoot> | null = null;
  let rendererRef: Awaited<ReturnType<typeof createCliRenderer>> | null = null;
  let resolveExit: (() => void) | null = null;

  const waitUntilExit = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  (async () => {
    const renderer = await createCliRenderer({
      useMouse: true,
    });
    rendererRef = renderer;
    currentRenderer = renderer;
    rootRef = createRoot(renderer);
    renderer.on("destroy", () => {
      if (!destroyed) {
        destroyed = true;
        resolveExit?.();
      }
    });
    rootRef.render(node);
  })().catch(() => {
    if (!destroyed) {
      destroyed = true;
      resolveExit?.();
    }
  });

  return {
    waitUntilExit: () => waitUntilExit,
    clear: () => undefined,
    unmount: () => {
      rootRef?.unmount();
      rendererRef?.destroy();
      currentRenderer = null;
      if (!destroyed) {
        destroyed = true;
        resolveExit?.();
      }
    },
  };
}

let currentRenderer: Awaited<ReturnType<typeof createCliRenderer>> | null =
  null;
const TextNestingContext = createContext(false);
