import { existsSync, unlinkSync } from "node:fs";
import { logger } from "@openfarm/logger";

/**
 * Interface for tracking temporary files.
 */
export interface TempFileEntry {
  /** Absolute or relative path to the temporary file */
  path: string;
  /** Whether the file existed before being created by the manager */
  existedBefore: boolean;
}

/**
 * Manager for tracking and cleaning up temporary files created during workflow execution.
 * This service centralizes temporary file management to prevent file leaks.
 *
 * @example
 * ```typescript
 * const tempFileManager = new TempFileManager();
 *
 * // Register a file that was created (will be cleaned up)
 * await tempFileManager.registerFile('/path/to/.tmp-ignore', false);
 *
 * // Register a file that existed before (won't be cleaned up)
 * await tempFileManager.registerFile('/path/to/.gitignore', true);
 *
 * // Cleanup all files that didn't exist before
 * await tempFileManager.cleanup();
 * ```
 */
export class TempFileManager {
  private readonly files: Map<string, TempFileEntry> = new Map();

  /**
   * Registers a temporary file for cleanup tracking.
   *
   * @param filePath - Path to the file
   * @param existedBefore - Whether the file existed before being created by the manager
   * @returns void
   */
  registerFile(filePath: string, existedBefore: boolean): void {
    this.files.set(filePath, { path: filePath, existedBefore });
  }

  /**
   * Checks if a file path is registered for cleanup.
   *
   * @param filePath - Path to check
   * @returns true if the file is registered
   */
  isRegistered(filePath: string): boolean {
    return this.files.has(filePath);
  }

  /**
   * Gets information about a registered file.
   *
   * @param filePath - Path to the file
   * @returns TempFileEntry if registered, undefined otherwise
   */
  getFileInfo(filePath: string): TempFileEntry | undefined {
    return this.files.get(filePath);
  }

  /**
   * Cleans up all registered temporary files that didn't exist before.
   * Only files where `existedBefore` is `false` will be deleted.
   */
  cleanup(): void {
    const filesToCleanup: string[] = [];

    // Collect files that should be cleaned up (didn't exist before)
    for (const entry of this.files.values()) {
      if (!entry.existedBefore && existsSync(entry.path)) {
        filesToCleanup.push(entry.path);
      }
    }

    // Delete files
    for (const filePath of filesToCleanup) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        logger.warn({ error, filePath }, "Failed to cleanup temporary file");
      }
    }

    // Clear registry after cleanup
    this.files.clear();
  }

  /**
   * Clears the registry without deleting files.
   * Useful for resetting the manager state.
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Gets all registered file paths.
   *
   * @returns Array of registered file paths
   */
  getRegisteredFiles(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Gets count of files registered for cleanup (files that didn't exist before).
   *
   * @returns Number of files that will be cleaned up
   */
  getCleanupCount(): number {
    let count = 0;
    for (const entry of this.files.values()) {
      if (!entry.existedBefore) {
        count++;
      }
    }
    return count;
  }
}
