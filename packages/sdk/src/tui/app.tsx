import { Box } from "ink";
import { ContextScreen } from "./screens/context";
import { ContextConfigScreen } from "./screens/context-config";
import { Dashboard } from "./screens/dashboard";
import { Execute } from "./screens/execute";
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
      {screen === "workflows" && <WorkflowList />}
      {screen === "workflow-editor" && <WorkflowEditor />}
      {screen === "context-config" && <ContextConfigScreen />}
      {screen === "context" && <ContextScreen />}
    </Box>
  );
}
