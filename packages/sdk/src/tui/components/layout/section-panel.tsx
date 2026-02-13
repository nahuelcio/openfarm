import { Box, Text } from "@openfarm/tui-opentui";
import { type Screen, useStore } from "../../store";
import { useRemoteStore } from "../../store/remote-store";
import { useTaskLoopStore } from "../../store/task-loop-store";
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

function WorkflowsPanel({ onNavigate }: Pick<SectionPanelProps, "onNavigate">) {
  const colors = useThemeColors();
  const workflows = useStore((state) => state.workflows);
  const currentWorkflow = useStore((state) => state.currentWorkflow);
  const setCurrentWorkflow = useStore((state) => state.setCurrentWorkflow);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Workflows
      </Text>
      <ClickRow
        onPress={() => onNavigate("workflows")}
        primary="Open workflow list"
      />
      <Box borderStyle="single" flexDirection="column">
        <Box paddingX={1}>
          <Text color={colors.secondary}>Loaded</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {workflows.length === 0 ? (
            <Text color={colors.muted}>No workflows loaded</Text>
          ) : (
            workflows.slice(0, 20).map((workflow) => (
              <ClickRow
                key={workflow.id}
                onPress={() => {
                  setCurrentWorkflow(workflow);
                  onNavigate("workflow-editor");
                }}
                primary={workflow.name || workflow.id}
                secondary={workflow.id}
                selected={currentWorkflow?.id === workflow.id}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ContextPanel({ screen, onNavigate }: SectionPanelProps) {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Context
      </Text>
      <ClickRow
        onPress={() => onNavigate("context-config")}
        primary="Configure provider/model"
        selected={screen === "context-config"}
      />
      <ClickRow
        onPress={() => onNavigate("context")}
        primary="Generate context"
        selected={screen === "context"}
      />
      <ClickRow
        onPress={() => onNavigate("context-history")}
        primary="Context history"
        selected={screen === "context-history"}
      />
    </Box>
  );
}

function RemotesPanel({ onNavigate }: Pick<SectionPanelProps, "onNavigate">) {
  const colors = useThemeColors();
  const instances = useRemoteStore((state) => state.instances);
  const selectedInstanceId = useRemoteStore(
    (state) => state.selectedInstanceId
  );
  const selectInstance = useRemoteStore((state) => state.selectInstance);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Remote Instances
      </Text>
      <ClickRow
        onPress={() => onNavigate("remotes")}
        primary="Manage instances"
      />
      <Box borderStyle="single" flexDirection="column">
        <Box paddingX={1}>
          <Text color={colors.secondary}>Configured</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {instances.length === 0 ? (
            <Text color={colors.muted}>No remotes configured</Text>
          ) : (
            instances.map((instance) => (
              <ClickRow
                key={instance.id}
                onPress={() => {
                  selectInstance(instance.id);
                  onNavigate("remotes");
                }}
                primary={`${instance.status === "connected" ? "●" : "○"} ${instance.name}`}
                secondary={instance.url}
                selected={selectedInstanceId === instance.id}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function TaskLoopPanel({ onNavigate }: Pick<SectionPanelProps, "onNavigate">) {
  const colors = useThemeColors();
  const lifecycle = useTaskLoopStore((state) => state.lifecycle);
  const tasks = useTaskLoopStore((state) => state.tasks);
  const selectedTaskIndex = useTaskLoopStore(
    (state) => state.selectedTaskIndex
  );
  const setSelectedTaskIndex = useTaskLoopStore(
    (state) => state.setSelectedTaskIndex
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={colors.primary}>
        Loop
      </Text>
      <ClickRow
        onPress={() => onNavigate("task-loop")}
        primary="Open execution loop"
        secondary={`state: ${lifecycle}`}
      />
      <Box borderStyle="single" flexDirection="column">
        <Box paddingX={1}>
          <Text color={colors.secondary}>Tasks</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {tasks.length === 0 ? (
            <Text color={colors.muted}>No tasks loaded</Text>
          ) : (
            tasks.slice(0, 18).map((task, index) => (
              <ClickRow
                key={task.id}
                onPress={() => {
                  setSelectedTaskIndex(index);
                  onNavigate("task-loop");
                }}
                primary={`${getStatusIcon(task.status)} ${task.title}`}
                selected={index === selectedTaskIndex}
              />
            ))
          )}
        </Box>
      </Box>
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
