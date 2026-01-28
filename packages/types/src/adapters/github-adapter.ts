export interface GitHubAdapter {
  createIssue(title: string, body: string): Promise<string>;
  createPR(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<string>;
  closeIssue(issueNumber: string): Promise<void>;
  mergePR(prNumber: string): Promise<void>;
  addComment(issueNumber: string, comment: string): Promise<void>;
  getFileContent(path: string, branch?: string): Promise<string>;
  updateFile(
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<void>;
}
