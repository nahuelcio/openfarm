#!/usr/bin/env bun
/**
 * Remote Server CLI
 *
 * Start a WebSocket server for remote task loop control.
 */

import { Box, render, Text } from "@openfarm/tui-opentui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenFarmConfig } from "../types";

interface ClientInfo {
  id: string;
  authenticated: boolean;
  connectedAt: string;
}

interface RemoteServerCliProps {
  port: number;
  token: string;
}

function RemoteServerCLI({ port, token }: RemoteServerCliProps) {
  const [status, setStatus] = useState<"starting" | "running" | "error">(
    "starting"
  );
  const [clients, _setClients] = useState<ClientInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const _clientsRef = useRef<Map<string, ClientInfo>>(new Map());

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      ...prev.slice(-50),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  const startServer = useCallback(async () => {
    try {
      addLog(`🚀 Starting Remote Server on port ${port}...`);

      const { RemoteServer } = await import("@openfarm/remote-server");

      const server = new RemoteServer({
        port,
        authToken: token,
      });

      await server.start();
      setStatus("running");
      addLog(`✅ Server running on ws://localhost:${port}`);
      addLog(`🔑 Auth token: ${token.slice(0, 4)}...${token.slice(-4)}`);
    } catch (error) {
      setStatus("error");
      addLog(`💥 Failed to start: ${error}`);
    }
  }, [port, token, addLog]);

  useEffect(() => {
    startServer();
  }, [startServer]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        🌐 OpenFarm Remote Server
      </Text>
      <Text
        color={
          status === "running" ? "green" : status === "error" ? "red" : "yellow"
        }
      >
        Status: {status.toUpperCase()}
      </Text>
      <Text>Port: {port}</Text>
      <Text>Connected clients: {clients.length}</Text>
      {clients.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {clients.map((c) => (
            <Text color="green" key={c.id}>
              ● {c.id} {c.authenticated ? "(auth)" : "(pending)"}
            </Text>
          ))}
        </Box>
      )}
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Logs:</Text>
        {logs.map((log, i) => (
          <Text color="gray" key={i}>
            {log}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to stop server</Text>
      </Box>
    </Box>
  );
}

export async function runRemoteServerCLI(
  args: string[],
  _config: OpenFarmConfig
): Promise<void> {
  const port = Number.parseInt(
    args.find((a) => a.startsWith("--port="))?.split("=")[1] || "8080",
    10
  );
  const token =
    args.find((a) => a.startsWith("--token="))?.split("=")[1] ||
    process.env.OPENFARM_REMOTE_TOKEN ||
    "openfarm-secret-token";

  const { waitUntilExit } = render(
    <RemoteServerCLI port={port} token={token} />
  );
  await waitUntilExit();
}
