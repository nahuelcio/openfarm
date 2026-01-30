import { Box } from "ink";
import { ContextScreen } from "./screens/Context";
import { ContextConfigScreen } from "./screens/ContextConfig";
import { Dashboard } from "./screens/Dashboard";
import { Execute } from "./screens/Execute";
import { History } from "./screens/History";
import { Running } from "./screens/Running";
import { WorkflowEditor } from "./screens/WorkflowEditor";
import { WorkflowList } from "./screens/WorkflowList";
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
