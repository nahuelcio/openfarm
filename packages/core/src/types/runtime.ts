import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";

export interface FileSystem {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => { isDirectory: () => boolean };
  rmSync: (
    path: string,
    options?: { recursive?: boolean; force?: boolean }
  ) => void;
}

export const defaultFileSystem: FileSystem = {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
};

export type DbFileSystem = Pick<
  FileSystem,
  "existsSync" | "mkdirSync" | "readdirSync" | "statSync" | "rmSync"
>;

export type ExecFunction = (
  file: string,
  args: string[],
  options?: { cwd?: string }
) => Promise<{ stdout: string; stderr: string }>;
