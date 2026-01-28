import * as fs from "node:fs";
import type { Secret } from "../types";
import {
  generateId,
  getCodeSnippet,
  getLineNumber,
  readFile,
  shouldSkipFile,
} from "../utils";

export class SecretDetector {
  async detectSecrets(projectPath: string): Promise<Secret[]> {
    const secrets: Secret[] = [];
    const files = await this.getFilesWithSecrets(projectPath);

    // Common secret patterns
    const patterns = [
      { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/g },
      { name: "AWS Secret Key", pattern: /[0-9a-zA-Z/+]{40}/g },
      { name: "GitHub Token", pattern: /github_pat_[a-zA-Z0-9_]{36,}/g },
      { name: "GitHub OAuth Token", pattern: /gho_[a-zA-Z0-9]{36}/g },
      {
        name: "API Key",
        pattern: /api[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,})['"]/gi,
      },
      {
        name: "Secret Key",
        pattern: /secret[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,})['"]/gi,
      },
      {
        name: "JWT",
        pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      },
      {
        name: "Private Key",
        pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
      },
      { name: "Password", pattern: /password\s*[:=]\s*['"]([^'"]{8,})['"]/gi },
      { name: "Bearer Token", pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g },
    ];

    for (const file of files) {
      if (shouldSkipFile(file)) {
        continue;
      }

      try {
        const content = await readFile(file);

        for (const patternObj of patterns) {
          const matches = content.matchAll(patternObj.pattern);
          for (const match of matches) {
            const secretValue = match[1] || match[0];
            const lineNumber = getLineNumber(content, match.index || 0);
            const codeSnippet = getCodeSnippet(content, lineNumber, 5);
            secrets.push({
              id: generateId(),
              type: patternObj.name,
              severity: "critical",
              title: `Potential ${patternObj.name} detected`,
              description: `Found possible ${patternObj.name} in ${file}`,
              affectedFiles: [
                {
                  path: file,
                  line: lineNumber,
                  codeSnippet: codeSnippet || undefined,
                },
              ],
              secret: this.redactSecret(secretValue),
              suggestedFix:
                "Remove the secret and use environment variables or a secret manager",
            });
          }
        }
      } catch (_error) {}
    }

    // Deduplicate by line
    const uniqueSecrets = new Map<string, Secret>();
    for (const secret of secrets) {
      const key = `${secret.affectedFiles[0]!.path}:${secret.affectedFiles[0]!.line || 0}:${secret.type}`;
      uniqueSecrets.set(key, secret);
    }

    return Array.from(uniqueSecrets.values());
  }

  private async getFilesWithSecrets(projectPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scanDirectory(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = require("node:path").join(dir, entry.name);

        // Skip node_modules, .git, dist, build, node_modules
        if (
          ["node_modules", ".git", "dist", "build", "coverage"].includes(
            entry.name
          )
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // Exclude markdown, text files, and database files from analysis
          const excludedExtensions = [".md", ".txt", ".db"];
          const ext = require("node:path").extname(fullPath).toLowerCase();
          if (!excludedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await scanDirectory(projectPath);
    return files;
  }

  private redactSecret(secret: string): string {
    if (secret.length <= 8) {
      return "*".repeat(secret.length);
    }
    return (
      secret.substring(0, 4) +
      "*".repeat(secret.length - 8) +
      secret.substring(secret.length - 4)
    );
  }
}
