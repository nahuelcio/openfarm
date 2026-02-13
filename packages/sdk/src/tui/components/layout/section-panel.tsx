import { Box, Text } from "@openfarm/tui-opentui";
import { type Screen, useStore } from "../../store";
import { useThemeColors } from "../../theme/hooks";
import { getStatusIcon } from "../../utils/status-helpers";

export type SectionId = "dashboard" | "execute" | "multi-agents" | "history";

interface SectionPanelProps {
  sectionId: SectionId;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

interface ClickRowProps {
  selected?: boolean;
  primary: string;
  secondary?: string;
  accent?: string;
  onPress: () => void;
}

function ClickRow({
  selected = false,
  primary,
  secondary,
  accent,
  onPress,
}: ClickRowProps) {
  const colors = useThemeColors();

  return (
    <Box
      backgroundColor={selected ? colors.border : undefined}
      flexDirection="column"
      onMouseDown={onPress}
      paddingX={1}
      paddingY={selected ? 1 : 0}
    >
      <Text
        bold={selected}
        color={accent || colors.foreground}
        wrap="truncate-end"
      >
        {primary}
      </Text>
      {secondary ? (
        <Text color={colors.muted} dimColor wrap="truncate-end">
          {secondary}
        </Text>
      ) : null}
    </Box>
  );
}

function DashboardPanel({ onNavigate }: Pick<SectionPanelProps, "onNavigate">) {
  const colors = useThemeColors();
  const executions = useStore((state) => state.executions);
  const setCurrentExecution = useStore((state) => state.setCurrentExecution);

  const completed = executions.filter(
    (item) => item.status === "completed"
  ).length;
  const failed = executions.filter((item) => item.status === "failed").length;
  const running = executions.filter((item) => item.status === "running").length;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Overview
      </Text>
      <Text color={colors.muted}>
        Total {executions.length} | Running {running} | Done {completed} |
        Failed {failed}
      </Text>
      <Box borderStyle="single" flexDirection="column">
        <Box paddingX={1}>
          <Text bold color={colors.secondary}>
            Recent
          </Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {executions.length === 0 ? (
            <Text color={colors.muted}>No executions yet</Text>
          ) : (
            executions.slice(0, 12).map((execution) => (
              <ClickRow
                accent={colors.foreground}
                key={execution.id}
                onPress={() => {
                  setCurrentExecution(execution);
                  onNavigate("execution-detail");
                }}
                primary={`${getStatusIcon(execution.status)} ${execution.task}`}
                secondary={`${execution.provider} · ${execution.startedAt.toLocaleTimeString()}`}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ExecutePanel({ screen, onNavigate }: SectionPanelProps) {
  const colors = useThemeColors();
  const provider = useStore((state) => state.provider);
  const model = useStore((state) => state.model);
  const workspace = useStore((state) => state.workspace);
  const currentExecution = useStore((state) => state.currentExecution);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Execution
      </Text>
      <ClickRow
        onPress={() => onNavigate("execute")}
        primary="Setup new execution"
        selected={screen === "execute"}
      />
      <ClickRow
        onPress={() => onNavigate("task-loop")}
        primary="Open task loop"
        selected={screen === "task-loop"}
      />
      {currentExecution ? (
        <ClickRow
          onPress={() => onNavigate("running")}
          primary={`Resume ${currentExecution.id.slice(0, 8)}`}
          secondary={currentExecution.task}
          selected={screen === "running"}
        />
      ) : null}
      <Box borderStyle="single" flexDirection="column" padding={1}>
        <Text color={colors.secondary}>Provider</Text>
        <Text wrap="truncate-end">{provider || "-"}</Text>
        <Text color={colors.secondary}>Model</Text>
        <Text wrap="truncate-end">{model || "(default)"}</Text>
        <Text color={colors.secondary}>Workspace</Text>
        <Text wrap="truncate-end">{workspace}</Text>
      </Box>
    </Box>
  );
}

function HistoryPanel({ screen, onNavigate }: SectionPanelProps) {
  const colors = useThemeColors();
  const executions = useStore((state) => state.executions);
  const currentExecution = useStore((state) => state.currentExecution);
  const setCurrentExecution = useStore((state) => state.setCurrentExecution);
  const setSelectedExecutionForDiff = useStore(
    (state) => state.setSelectedExecutionForDiff
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        History
      </Text>
      <Box borderStyle="single" flexDirection="column">
        <Box paddingX={1}>
          <Text color={colors.secondary}>Executions</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {executions.length === 0 ? (
            <Text color={colors.muted}>No data</Text>
          ) : (
            executions.slice(0, 24).map((execution) => (
              <ClickRow
                key={execution.id}
                onPress={() => {
                  setCurrentExecution(execution);
                  onNavigate("execution-detail");
                }}
                primary={`${getStatusIcon(execution.status)} ${execution.task}`}
                secondary={execution.id.slice(0, 8)}
                selected={
                  currentExecution?.id === execution.id &&
                  screen !== "diff-viewer"
                }
              />
            ))
          )}
        </Box>
      </Box>
      {currentExecution?.diff ? (
        <ClickRow
          onPress={() => {
            setSelectedExecutionForDiff(currentExecution);
            onNavigate("diff-viewer");
          }}
          primary="Open diff viewer"
          selected={screen === "diff-viewer"}
        />
      ) : null}
    </Box>
  );
}

export function SectionPanel({
  sectionId,
  screen,
  onNavigate,
}: SectionPanelProps) {
  return (
    <Box flexDirection="column" flexGrow={1} gap={1} padding={1}>
      {sectionId === "dashboard" ? (
        <DashboardPanel onNavigate={onNavigate} />
      ) : null}
      {sectionId === "execute" ? (
        <ExecutePanel
          onNavigate={onNavigate}
          screen={screen}
          sectionId={sectionId}
        />
      ) : null}
      {sectionId === "multi-agents" ? (
        <Box padding={2}>
          <Text bold>🤖 Multi-Agent Dashboard</Text>
          <Text color="gray" dim>
            Press 3 to access
          </Text>
        </Box>
      ) : null}
      {sectionId === "history" ? (
        <HistoryPanel
          onNavigate={onNavigate}
          screen={screen}
          sectionId={sectionId}
        />
      ) : null}
    </Box>
  );
}
