import { Box } from "ink";
import { ContextScreen } from "./screens/context";
import { ContextConfigScreen } from "./screens/context-config";
import { ContextHistoryScreen } from "./screens/context-history";
import { Dashboard } from "./screens/dashboard";
import { DiffViewer } from "./screens/diff-viewer";
import { Execute } from "./screens/execute";
import { ExecutionDetail } from "./screens/execution-detail";
import { History } from "./screens/history";
import { Running } from "./screens/running";
import { WorkflowEditor } from "./screens/workflow-editor";
import { WorkflowList } from "./screens/workflow-list";
import { useStore } from "./store";

export function App() {
  const { screen } = useStore();

  return (
    <Box flexDirection="column" padding={1}>
      {screen === "dashboard" && <Dashboard />}
      {screen === "execute" && <Execute />}
      {screen === "running" && <Running />}
      {screen === "history" && <History />}
      {screen === "diff-viewer" && <DiffViewer />}
      {screen === "execution-detail" && <ExecutionDetail />}
      {screen === "workflows" && <WorkflowList />}
      {screen === "workflow-editor" && <WorkflowEditor />}
      {screen === "context-config" && <ContextConfigScreen />}
      {screen === "context" && <ContextScreen />}
      {screen === "context-history" && <ContextHistoryScreen />}
    </Box>
  );
}
