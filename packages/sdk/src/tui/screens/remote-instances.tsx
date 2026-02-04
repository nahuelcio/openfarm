/**
 * Remote Instances Screen
 *
 * Manage and connect to remote OpenFarm instances.
 */

import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { RemoteInstanceList } from "../components/remote-tabs";
import { useRemoteStore } from "../store/remote-store";

export function RemoteInstancesScreen() {
  const { instances, addInstance, connect, disconnect } = useRemoteStore();
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
  });

  return (
    <Box flexDirection="column" padding={1} flexGrow={1}>
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

      {showAddForm && (
        <Box
          borderStyle="single"
          borderColor="yellow"
          padding={1}
          marginTop={1}
          flexDirection="column"
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
          Total instances: {instances.length} | Connected: {" "}
          {instances.filter((i) => i.status === "connected").length}
        </Text>
      </Box>
    </Box>
  );
}
