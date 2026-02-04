/**
 * Remote Tabs Component
 *
 * Displays tabs for local and remote instances.
 * Similar to Ralph TUI's remote instance management.
 */

import { Box, Text, useInput } from "ink";
import { useRemoteStore } from "../store/remote-store";

interface RemoteTabsProps {
  /** Currently active tab ID */
  activeTab: string;

  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;

  /** Show add button */
  showAddButton?: boolean;

  /** Callback to add new remote */
  onAddRemote?: () => void;
}

const STATUS_SYMBOLS: Record<string, string> = {
  connected: "●",
  connecting: "◐",
  disconnected: "○",
  error: "✗",
};

const STATUS_COLORS: Record<string, string> = {
  connected: "green",
  connecting: "yellow",
  disconnected: "gray",
  error: "red",
};

export function RemoteTabs({
  activeTab,
  onTabChange,
  showAddButton = true,
  onAddRemote,
}: RemoteTabsProps) {
  const { instances } = useRemoteStore();

  // Build tabs list
  const tabs = [
    { id: "local", label: "LOCAL", status: "connected" as const },
    ...instances.map((i) => ({
      id: i.id,
      label: i.name.toUpperCase(),
      status: i.status,
    })),
  ];

  useInput((input, key) => {
    // [ and ] for navigation
    if (input === "[") {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      onTabChange(tabs[newIndex].id);
    } else if (input === "]") {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      onTabChange(tabs[newIndex].id);
    }

    // Number keys 1-9
    const num = Number.parseInt(input, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= tabs.length) {
      onTabChange(tabs[num - 1].id);
    }

    // a to add remote
    if (input === "a" && showAddButton) {
      onAddRemote?.();
    }
  });

  return (
    <Box flexDirection="row" gap={1} height={1}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const color = STATUS_COLORS[tab.status] || "gray";
        const symbol = STATUS_SYMBOLS[tab.status] || "○";

        return (
          <Box flexDirection="row" key={tab.id}>
            <Text
              backgroundColor={isActive ? "cyan" : undefined}
              bold={isActive}
              color={isActive ? "black" : color}
            >
              {isActive ? "▶" : symbol} {index + 1}:{tab.label}{" "}
            </Text>
          </Box>
        );
      })}

      {showAddButton && (
        <Text color="gray">
          {" "}
          <Text color="yellow">[a]</Text>+
        </Text>
      )}
    </Box>
  );
}

/**
 * Remote Instance List
 *
 * Shows detailed list of all remote instances
 */
export function RemoteInstanceList() {
  const { instances, connect, disconnect, selectInstance, selectedInstanceId } =
    useRemoteStore();

  useInput((input, key) => {
    if (!instances.length) {
      return;
    }

    const currentIndex = instances.findIndex(
      (i) => i.id === selectedInstanceId
    );

    if (key.upArrow) {
      const newIndex =
        currentIndex > 0 ? currentIndex - 1 : instances.length - 1;
      selectInstance(instances[newIndex].id);
    } else if (key.downArrow) {
      const newIndex =
        currentIndex < instances.length - 1 ? currentIndex + 1 : 0;
      selectInstance(instances[newIndex].id);
    }

    // c to connect/disconnect
    if (input === "c" && selectedInstanceId) {
      const instance = instances.find((i) => i.id === selectedInstanceId);
      if (instance?.status === "connected") {
        disconnect(selectedInstanceId);
      } else if (
        instance?.status === "disconnected" ||
        instance?.status === "error"
      ) {
        connect(selectedInstanceId).catch(() => {});
      }
    }
  });

  if (instances.length === 0) {
    return (
      <Box padding={1}>
        <Text color="gray">No remote instances configured.</Text>
        <Text color="gray">Press [a] to add one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Remote Instances:</Text>
      <Box flexDirection="column" marginTop={1}>
        {instances.map((instance) => {
          const isSelected = instance.id === selectedInstanceId;
          const color = STATUS_COLORS[instance.status] || "gray";
          const symbol = STATUS_SYMBOLS[instance.status] || "○";

          return (
            <Box flexDirection="row" gap={1} key={instance.id}>
              <Text color={isSelected ? "cyan" : "gray"}>
                {isSelected ? ">" : " "}
              </Text>
              <Text color={color}>{symbol}</Text>
              <Text bold={isSelected}>{instance.name}</Text>
              <Text color="gray">({instance.url})</Text>
              {instance.error && (
                <Text color="red">- {instance.error.slice(0, 30)}...</Text>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          [←→] Navigate | [c] Connect/Disconnect | [d] Delete | [a] Add
        </Text>
      </Box>
    </Box>
  );
}
