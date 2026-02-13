import { Box, Text } from "@openfarm/tui-opentui";
import { OverlayContainer } from "./overlay-container";

export interface ResumableSession {
  id: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  currentTaskTitle?: string;
  completedTasks: number;
  failedTasks: number;
  totalTasks: number;
}

interface ResumeSessionDialogProps {
  sessions: ResumableSession[];
  selectedIndex: number;
}

function formatDuration(startedAt: string): string {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) {
    return "unknown";
  }
  const diffMinutes = Math.max(0, Math.floor((Date.now() - started) / 60_000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ResumeSessionDialog({
  sessions,
  selectedIndex,
}: ResumeSessionDialogProps) {
  return (
    <OverlayContainer
      footer="enter resume | r refresh | esc dismiss"
      title="Resume Task Loop Session"
    >
      <Box flexDirection="column" gap={1}>
        {sessions.length === 0 ? (
          <Text>No resumable sessions found.</Text>
        ) : (
          sessions.map((session, index) => {
            const selected = index === selectedIndex;
            const prefix = selected ? ">" : " ";
            return (
              <Box flexDirection="column" key={session.id}>
                <Text bold={selected}>
                  {prefix} {session.currentTaskTitle || "Task Loop Session"}
                </Text>
                <Text dimColor>
                  id {session.id.slice(0, 12)} | status {session.status} |{" "}
                  {session.completedTasks}/{session.totalTasks} completed |{" "}
                  {session.failedTasks} failed | running{" "}
                  {formatDuration(session.startedAt)}
                </Text>
                <Text dimColor>
                  last update {new Date(session.updatedAt).toLocaleTimeString()}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </OverlayContainer>
  );
}
