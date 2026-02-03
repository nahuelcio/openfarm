import { exec } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Copies text to clipboard using OS-specific commands
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const os = platform();

    if (os === "darwin") {
      // macOS
      await execAsync("pbcopy", { input: text });
    } else if (os === "win32") {
      // Windows - use powershell
      const escaped = text.replace(/"/g, '""');
      await execAsync(
        `powershell -command "Set-Clipboard -Value '${escaped}'"`
      );
    } else {
      // Linux - try xclip first, then xsel
      try {
        await execAsync("xclip -selection clipboard", { input: text });
      } catch {
        await execAsync("xsel --clipboard --input", { input: text });
      }
    }
    return true;
  } catch {
    return false;
  }
}
