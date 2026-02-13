import { useEffect, useState } from "react";
import { Text } from "./runtime";

const FRAMES = {
  dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  line: ["-", "\\", "|", "/"],
} as const;

interface SpinnerProps {
  type?: keyof typeof FRAMES;
}

export default function Spinner({ type = "dots" }: SpinnerProps) {
  const [idx, setIdx] = useState(0);
  const frames = FRAMES[type] || FRAMES.dots;

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((previous) => (previous + 1) % frames.length);
    }, 100);
    return () => clearInterval(interval);
  }, [frames.length]);

  return <Text>{frames[idx]}</Text>;
}
