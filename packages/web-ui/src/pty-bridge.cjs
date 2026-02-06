#!/usr/bin/env node
/**
 * PTY Bridge - Runs under Node.js to provide real PTY support.
 * Communicates with the parent Bun process via stdin/stdout.
 *
 * Protocol:
 *   Parent → Bridge (stdin, line-delimited JSON):
 *     {"type":"data","payload":"base64-encoded-input"}
 *     {"type":"resize","cols":120,"rows":40}
 *     {"type":"kill"}
 *
 *   Bridge → Parent (stdout, line-delimited JSON):
 *     {"type":"data","payload":"base64-encoded-output"}
 *     {"type":"exit","code":0}
 *     {"type":"ready"}
 */

const pty = require("node-pty");

const args = process.argv.slice(2);
const cwd = args[0] || process.cwd();
const cols = parseInt(args[1] || "120", 10);
const rows = parseInt(args[2] || "40", 10);
const cmd = args[3] || "bun";
const cmdArgs = args.slice(4);

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const term = pty.spawn(cmd, cmdArgs.length ? cmdArgs : ["run", "tui"], {
  name: "xterm-256color",
  cols,
  rows,
  cwd,
  env: {
    ...process.env,
    TERM: "xterm-256color",
    FORCE_COLOR: "1",
    OPENFARM_WEB_MODE: "1",
  },
});

term.onData((data) => {
  send({ type: "data", payload: Buffer.from(data, "utf-8").toString("base64") });
});

term.onExit(({ exitCode }) => {
  send({ type: "exit", code: exitCode });
  process.exit(0);
});

send({ type: "ready" });

// Read commands from stdin (line-delimited JSON)
let buffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      switch (msg.type) {
        case "data":
          term.write(Buffer.from(msg.payload, "base64").toString("utf-8"));
          break;
        case "resize":
          if (msg.cols > 0 && msg.rows > 0) {
            term.resize(msg.cols, msg.rows);
          }
          break;
        case "kill":
          term.kill();
          break;
      }
    } catch {
      // Ignore invalid JSON
    }
  }
});

process.stdin.on("end", () => {
  term.kill();
  process.exit(0);
});
