export interface GitConfig {
  repoPath: string;
  repoUrl: string; // For cloning if needed
  pat?: string; // Optional PAT for Azure DevOps authentication
  gitUserName?: string; // Git user name for commits
  gitUserEmail?: string; // Git user email for commits
}
