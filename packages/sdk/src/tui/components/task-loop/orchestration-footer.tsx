import { Footer } from "../layout/footer";

interface OrchestrationFooterProps {
  lifecycle:
    | "ready"
    | "starting"
    | "selecting"
    | "executing"
    | "paused"
    | "completed"
    | "error";
  message: string;
}

const BASE_SHORTCUTS = [
  { key: "s", label: "start" },
  { key: "p", label: "pause" },
  { key: "j/k", label: "nav" },
  { key: "o", label: "output" },
  { key: "v", label: "view" },
  { key: "?", label: "help" },
  { key: ",", label: "settings" },
  { key: "q", label: "quit" },
];

const RUNNING_SHORTCUTS = [
  { key: "+/-", label: "iters" },
  { key: "d", label: "dashboard" },
];

const IDLE_SHORTCUTS = [
  { key: "r", label: "refresh" },
  { key: "d", label: "dashboard" },
];

export function OrchestrationFooter({
  lifecycle,
  message,
}: OrchestrationFooterProps) {
  const isRunning = lifecycle === "executing" || lifecycle === "selecting";
  const shortcuts = [
    ...BASE_SHORTCUTS,
    ...(isRunning ? RUNNING_SHORTCUTS : IDLE_SHORTCUTS),
  ];
  return <Footer message={message} shortcuts={shortcuts} />;
}
