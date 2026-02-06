import type { CSSProperties, PropsWithChildren, ReactNode } from "react";

export type BorderStyle = "single" | "double" | "round" | "bold";

export interface BoxProps extends PropsWithChildren {
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
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
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
  flexShrink?: number;
  flexBasis?: number | string;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  title?: string;
  onMouse?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
}

const BORDER_STYLES: Record<BorderStyle, string> = {
  single: "1px solid",
  double: "3px double",
  round: "2px solid",
  bold: "2px solid",
};

const BORDER_RADIUS: Record<BorderStyle, number> = {
  single: 0,
  double: 0,
  round: 6,
  bold: 0,
};

export function Box({
  children,
  border,
  borderStyle = "single",
  borderColor = "#333",
  flexDirection = "row",
  justifyContent = "flex-start",
  alignItems = "stretch",
  gap = 0,
  padding,
  paddingX,
  paddingY,
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  margin,
  marginX,
  marginY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  width,
  height,
  flexGrow,
  flexShrink,
  flexBasis,
  overflow = "visible",
  title,
}: BoxProps): ReactNode {
  const showBorder = border ?? false;

  const pLeft = paddingLeft ?? paddingX ?? padding ?? 0;
  const pRight = paddingRight ?? paddingX ?? padding ?? 0;
  const pTop = paddingTop ?? paddingY ?? padding ?? 0;
  const pBottom = paddingBottom ?? paddingY ?? padding ?? 0;

  const mLeft = marginLeft ?? marginX ?? margin ?? 0;
  const mRight = marginRight ?? marginX ?? margin ?? 0;
  const mTop = marginTop ?? marginY ?? margin ?? 0;
  const mBottom = marginBottom ?? marginY ?? margin ?? 0;

  const style: CSSProperties = {
    display: "flex",
    flexDirection,
    justifyContent,
    alignItems,
    gap: `${gap * 4}px`,
    paddingLeft: `${pLeft * 4}px`,
    paddingRight: `${pRight * 4}px`,
    paddingTop: `${pTop * 4}px`,
    paddingBottom: `${pBottom * 4}px`,
    marginLeft: `${mLeft * 4}px`,
    marginRight: `${mRight * 4}px`,
    marginTop: `${mTop * 4}px`,
    marginBottom: `${mBottom * 4}px`,
    width: typeof width === "number" ? `${width * 4}px` : width,
    height: typeof height === "number" ? `${height * 4}px` : height,
    flexGrow,
    flexShrink,
    flexBasis: typeof flexBasis === "number" ? `${flexBasis * 4}px` : flexBasis,
    overflow,
    boxSizing: "border-box",
    position: "relative",
    ...(showBorder && {
      border: BORDER_STYLES[borderStyle],
      borderColor,
      borderRadius: `${BORDER_RADIUS[borderStyle]}px`,
    }),
  };

  return (
    <div style={style}>
      {title && (
        <div
          style={{
            position: "absolute",
            top: "-10px",
            left: "8px",
            background: "var(--bg-color, #1a1a1a)",
            padding: "0 4px",
            fontSize: "12px",
            color: borderColor,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
