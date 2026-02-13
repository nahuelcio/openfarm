/**
 * Remote Instances Screen
 *
 * Manage and connect to remote OpenFarm instances.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { HelpOverlay } from "../components";
import { RemoteInstanceList } from "../components/remote-tabs";
import { useNavigationKeys } from "../hooks";
import { useStore } from "../store";
import { useRemoteStore } from "../store/remote-store";

export function RemoteInstancesScreen() {
  const {
    instances,
    addInstance,
    selectedInstanceId,
    selectInstance,
    startTaskLoop,
    pauseTaskLoop,
    resumeTaskLoop,
    cancelTaskLoop,
    requestStatus,
  } = useRemoteStore();
  const { provider, model, setScreen } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceUrl, setNewInstanceUrl] = useState("");

  // Use standardized navigation keys
  const { showingHelp } = useNavigationKeys({
    screen: "remote-instance",
    parentScreen: "dashboard",
    enableHelp: true,
    onNavigate: setScreen,
    blockNavigation: showAddForm,
  });

  useInput((input, key) => {
    // Don't process if help is showing
    if (showingHelp) {
      return;
    }

    if (showAddForm) {
      if (key.return && newInstanceName && newInstanceUrl) {
        addInstance({
          id: `remote-${Date.now()}`,
          name: newInstanceName,
          url: newInstanceUrl,
        });
        setShowAddForm(false);
        setNewInstanceName("");
        setNewInstanceUrl("");
      } else if (key.escape) {
        setShowAddForm(false);
      }
      return;
    }

    if (input === "a") {
      setShowAddForm(true);
    }

    if (input === "s" && selectedInstanceId) {
      startTaskLoop(selectedInstanceId, {
        config: {
          provider: provider || "external-agent",
          model: model || undefined,
          maxIterations: 5,
          stopOnFailure: false,
        },
      });
    }

    if (input === "p" && selectedInstanceId) {
      pauseTaskLoop(selectedInstanceId);
    }

    if (input === "r" && selectedInstanceId) {
      resumeTaskLoop(selectedInstanceId);
    }

    if (input === "x" && selectedInstanceId) {
      cancelTaskLoop(selectedInstanceId);
    }

    if (input === "g" && selectedInstanceId) {
      requestStatus(selectedInstanceId);
    }
  });

  const selectedInstance =
    instances.find((instance) => instance.id === selectedInstanceId) ||
    instances[0];

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      selectInstance(instances[0].id);
    }
  }, [instances, selectedInstanceId, selectInstance]);

  if (showingHelp) {
    return (
      <HelpOverlay
        content={
          <>
            <Box flexDirection="column">
              <Text bold>Navigation</Text>
              <Text> ↑/↓ Navigate instances</Text>
              <Text> Enter Select instance</Text>
              <Text> Esc Back to Dashboard (when not in add form)</Text>
              <Text> d Go to Dashboard</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Instance Management</Text>
              <Text> a Add new instance</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Task Loop Control (when instance selected)</Text>
              <Text> s Start loop</Text>
              <Text> p Pause loop</Text>
              <Text> r Resume loop</Text>
              <Text> x Cancel loop</Text>
              <Text> g Refresh status</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text bold>System</Text>
              <Text> ? Toggle Help</Text>
            </Box>
          </>
        }
        title="Remote Instances Help"
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Text bold color="cyan">
        Remote Instance Management
      </Text>

      <Box marginTop={1}>
        <Text color="gray">
          Connect to and control OpenFarm instances running on other machines.
        </Text>
      </Box>

      <Box marginTop={1}>
        <RemoteInstanceList />
      </Box>

      {selectedInstance?.session && (
        <Box
          borderColor="cyan"
          borderStyle="single"
          flexDirection="column"
          marginTop={1}
          padding={1}
        >
          <Text bold>Live Session</Text>
          <Text>status: {selectedInstance.session.status}</Text>
          <Text>session: {selectedInstance.session.id}</Text>
          <Text>
            progress: {selectedInstance.session.completedTasks}/
            {selectedInstance.session.tasks?.length || 0} completed,{" "}
            {selectedInstance.session.failedTasks} failed
          </Text>
        </Box>
      )}

      {showAddForm && (
        <Box
          borderColor="yellow"
          borderStyle="single"
          flexDirection="column"
          marginTop={1}
          padding={1}
        >
          <Text bold>Add Remote Instance</Text>
          <Box flexDirection="row" gap={1}>
            <Text color="gray">Name:</Text>
            <Text>{newInstanceName}</Text>
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text color="gray">URL:</Text>
            <Text>{newInstanceUrl}</Text>
          </Box>
          <Text color="gray" dimColor>
            Enter to confirm, Esc to cancel
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          Total instances: {instances.length} | Connected:{" "}
          {instances.filter((i) => i.status === "connected").length}
        </Text>
        <Text color="gray">
          [s] start [p] pause [r] resume [x] cancel [g] refresh [?] help
        </Text>
      </Box>
    </Box>
  );
}
