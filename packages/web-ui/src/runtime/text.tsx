import type { CSSProperties, PropsWithChildren, ReactNode } from "react";

export interface TextProps extends PropsWithChildren {
  color?: string;
  bgColor?: string;
  bold?: boolean;
  underline?: boolean;
  dimColor?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  wrap?: "wrap" | "truncate-end" | "nowrap";
  align?: "left" | "center" | "right";
}

export function Text({
  children,
  color = "inherit",
  bgColor,
  bold = false,
  underline = false,
  dimColor = false,
  italic = false,
  strikethrough = false,
  wrap = "wrap",
  align = "left",
}: TextProps): ReactNode {
  const style: CSSProperties = {
    color,
    backgroundColor: bgColor,
    fontWeight: bold ? "bold" : "normal",
    textDecoration: `${underline ? "underline " : ""}${strikethrough ? "line-through" : ""}`,
    fontStyle: italic ? "italic" : "normal",
    opacity: dimColor ? 0.65 : 1,
    whiteSpace: wrap === "nowrap" ? "nowrap" : wrap === "truncate-end" ? "nowrap" : "pre-wrap",
    overflow: wrap === "truncate-end" ? "hidden" : "visible",
    textOverflow: wrap === "truncate-end" ? "ellipsis" : "clip",
    textAlign: align,
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "14px",
    lineHeight: "1.4",
  };

  return <span style={style}>{children}</span>;
}
