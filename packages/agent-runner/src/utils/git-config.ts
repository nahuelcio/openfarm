import type { AgentConfig } from "@openfarm/core/types/domain";

/**
 * Validates and escapes URL for use in shell commands
 * @param url - URL to escape
 * @returns Escaped URL
 * @throws Error if URL is invalid
 */
export const escapeUrl = (url: string): string => {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL: must be a non-empty string");
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    // Only allow http, https, and git protocols
    if (!["http:", "https:", "git:"].includes(urlObj.protocol)) {
      throw new Error(`Invalid URL protocol: ${urlObj.protocol}`);
    }
  } catch (_error) {
    // If URL constructor fails, it might be a git URL without protocol
    // Check if it looks like a valid git URL
    if (!(url.match(/^(https?|git):\/\//) || url.match(/^[^@]+@[^:]+:/))) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  // Escape single quotes for use in single-quoted shell strings
  return url.replace(/'/g, "'\\''");
};

/**
 * Validates branch name against Git naming rules
 * @param branchName - Branch name to validate
 * @returns Validated branch name
 * @throws Error if branch name is invalid
 */
export function sanitizeBranchName(branchName: string): string {
  if (!branchName || typeof branchName !== "string") {
    throw new Error("Branch name must be a non-empty string");
  }

  // Git branch name rules:
  // - Can contain alphanumeric, /, _, -, and .
  // - Cannot start with . or end with .lock
  // - Cannot contain consecutive dots (..)
  // - Cannot contain spaces or control characters
  const branchNameRegex = /^[a-zA-Z0-9/_.-]+$/;

  if (!branchNameRegex.test(branchName)) {
    throw new Error(
      `Invalid branch name: ${branchName}. Branch names can only contain alphanumeric characters, /, _, -, and .`
    );
  }

  if (branchName.startsWith(".")) {
    throw new Error("Branch name cannot start with a dot");
  }

  if (branchName.endsWith(".lock")) {
    throw new Error("Branch name cannot end with .lock");
  }

  if (branchName.includes("..")) {
    throw new Error("Branch name cannot contain consecutive dots");
  }

  // Check for path traversal attempts
  if (branchName.includes("..") || branchName.startsWith("/")) {
    throw new Error("Invalid branch name: potential path traversal detected");
  }

  return branchName;
}

/**
 * Validates and sanitizes file system path
 * @param filePath - Path to validate
 * @param basePath - Base directory that the path must be within
 * @returns Normalized absolute path
 * @throws Error if path is invalid or outside basePath
 */
export function sanitizePath(filePath: string, basePath?: string): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Path must be a non-empty string");
  }

  // Remove any null bytes
  if (filePath.includes("\0")) {
    throw new Error("Path cannot contain null bytes");
  }

  // Use path module to normalize
  const path = require("node:path");
  const normalizedPath = path.resolve(filePath);

  // If basePath is provided, ensure the path is within it
  if (basePath) {
    const normalizedBase = path.resolve(basePath);
    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error(
        `Path ${normalizedPath} is outside allowed base directory ${normalizedBase}`
      );
    }
  }

  return normalizedPath;
}

/**
 * Sanitizes Git config values (email and name)
 * @param value - Value to sanitize
 * @param type - Type of config value ('email' or 'name')
 * @returns Sanitized value
 */
export function sanitizeGitConfig(
  value: string,
  type: "email" | "name"
): string {
  if (!value || typeof value !== "string") {
    throw new Error(`${type} must be a non-empty string`);
  }

  // Remove dangerous characters that could be used for command injection
  // Git config values should not contain: ; & | $ ` " \n \r
  const dangerousChars = /[;&|$`"\\\n\r]/g;
  if (dangerousChars.test(value)) {
    throw new Error(
      `Invalid ${type}: contains dangerous characters. Value: ${value}`
    );
  }

  // Basic email validation for email type
  if (type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`Invalid email format: ${value}`);
    }
  }

  // Limit length
  const maxLength = type === "email" ? 254 : 255; // RFC 5321 max email length
  if (value.length > maxLength) {
    throw new Error(
      `${type} exceeds maximum length of ${maxLength} characters`
    );
  }

  return value.trim();
}

export const getGitConfig = (
  config: AgentConfig
): { email: string; name: string } => {
  return {
    email: config.gitUserEmail || "minions-farm@automated.local",
    name: config.gitUserName || "Minions Farm Agent",
  };
};
