/**
 * Remote Instances Screen
 *
 * Manage and connect to remote OpenFarm instances.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { RemoteInstanceList } from "../components/remote-tabs";
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
  const { provider, model } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceUrl, setNewInstanceUrl] = useState("");

  useInput((input, key) => {
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
          [s] start loop [p] pause [r] resume [x] cancel [g] refresh status
        </Text>
      </Box>
    </Box>
  );
}
