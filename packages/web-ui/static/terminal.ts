import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";

// Control message protocol
const CONTROL_PREFIX = 0x00;

// Reconnection backoff
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

// DOM elements
const statusProject = document.getElementById("status-project")!;
const statusIndicator = document.getElementById("status-indicator")!;
const terminalContainer = document.getElementById("terminal-container")!;

// Initialize terminal
const terminal = new Terminal({
  fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
  fontSize: 14,
  theme: {
    background: "#1a1a1a",
    foreground: "#e0e0e0",
    cursor: "#e0e0e0",
    cursorAccent: "#1a1a1a",
    selectionBackground: "rgba(96, 165, 250, 0.3)",
    black: "#1a1a1a",
    red: "#f87171",
    green: "#4ade80",
    yellow: "#fbbf24",
    blue: "#60a5fa",
    magenta: "#c084fc",
    cyan: "#22d3ee",
    white: "#e0e0e0",
    brightBlack: "#666666",
    brightRed: "#fca5a5",
    brightGreen: "#86efac",
    brightYellow: "#fde68a",
    brightBlue: "#93c5fd",
    brightMagenta: "#d8b4fe",
    brightCyan: "#67e8f9",
    brightWhite: "#ffffff",
  },
  cursorBlink: true,
  allowProposedApi: true,
  scrollback: 10000,
});

// Addons
const fitAddon = new FitAddon();
const webLinksAddon = new WebLinksAddon();
const searchAddon = new SearchAddon();

terminal.loadAddon(fitAddon);
terminal.loadAddon(webLinksAddon);
terminal.loadAddon(searchAddon);

// Mount terminal
terminal.open(terminalContainer);
fitAddon.fit();

// Connection state
let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function setStatus(status: "connected" | "reconnecting" | "disconnected") {
  statusIndicator.className = `status-${status}`;
  statusIndicator.textContent =
    status === "connected"
      ? "Connected"
      : status === "reconnecting"
        ? "Reconnecting..."
        : "Disconnected";
}

function sendControlMessage(msg: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    const payload = new Uint8Array(msg.length + 1);
    payload[0] = CONTROL_PREFIX;
    for (let i = 0; i < msg.length; i++) {
      payload[i + 1] = msg.charCodeAt(i);
    }
    ws.send(payload);
  }
}

function connect() {
  // Build WebSocket URL from current page location
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const wsUrl = token
    ? `${protocol}//${window.location.host}/ws?token=${token}`
    : `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    setStatus("connected");
    reconnectAttempt = 0;

    // Send current terminal size
    sendControlMessage(`resize:${terminal.cols}:${terminal.rows}`);
  };

  ws.onmessage = (event) => {
    const data = event.data;
    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);

      // Check for control messages
      if (bytes.length > 0 && bytes[0] === CONTROL_PREFIX) {
        // Control message - ignore for now (pong, etc.)
        return;
      }

      terminal.write(bytes);
    } else if (typeof data === "string") {
      terminal.write(data);
    }
  };

  ws.onclose = () => {
    ws = null;
    setStatus("reconnecting");
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will fire after onerror
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  const delay =
    RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  reconnectAttempt++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

// Forward terminal input to WebSocket
terminal.onData((data) => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(data);
  }
});

// Forward resize events
terminal.onResize(({ cols, rows }) => {
  sendControlMessage(`resize:${cols}:${rows}`);
});

// Handle window resize with debounce
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    fitAddon.fit();
  }, 100);
});

// Handle clipboard - copy on selection
terminal.onSelectionChange(() => {
  const selection = terminal.getSelection();
  if (selection) {
    navigator.clipboard.writeText(selection).catch(() => {
      // Clipboard API not available or permission denied
    });
  }
});

// Fetch project info for status bar
fetch("/api/status")
  .then((res) => res.json())
  .then((data: { project?: string; version?: string }) => {
    statusProject.textContent = `OpenFarm ${data.version ?? ""} | ${data.project ?? ""}`;
  })
  .catch(() => {
    // Silently fail
  });

// Start connection
setStatus("disconnected");
connect();
