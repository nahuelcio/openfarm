import { execSync } from "node:child_process";
import { platform } from "node:os";

/**
 * Copies text to clipboard using OS-specific commands
 */
export function copyToClipboard(text: string): boolean {
  try {
    const os = platform();

    if (os === "darwin") {
      // macOS
      execSync("pbcopy", { input: text, encoding: "utf-8" });
    } else if (os === "win32") {
      // Windows - use powershell
      const escaped = text.replace(/"/g, '""');
      execSync(`powershell -command "Set-Clipboard -Value '${escaped}'"`, {
        encoding: "utf-8",
      });
    } else {
      // Linux - try xclip first, then xsel
      try {
        execSync("xclip -selection clipboard", {
          input: text,
          encoding: "utf-8",
        });
      } catch {
        execSync("xsel --clipboard --input", {
          input: text,
          encoding: "utf-8",
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}
