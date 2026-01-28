export interface GitAdapter {
  clone(repoUrl: string, targetPath: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
  status(): Promise<string>;
  add(files: string[]): Promise<void>;
}
