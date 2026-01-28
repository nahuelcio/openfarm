/**
 * Authenticates a GitHub repository URL with credentials.
 * This is a pure function that returns a new authenticated URL.
 *
 * @param repositoryUrl - Original repository URL
 * @param credentials - GitHub credentials (token)
 * @returns Authenticated URL
 *
 * @example
 * ```typescript
 * const authUrl = authenticateGitHubUrl(
 *   'https://github.com/owner/repo.git',
 *   'ghp_token123'
 * );
 * // Returns: 'https://x-access-token:ghp_token123@github.com/owner/repo.git'
 * ```
 */
export function authenticateGitHubUrl(
  repositoryUrl: string,
  credentials: string
): string {
  try {
    const urlObj = new URL(repositoryUrl);
    urlObj.username = "x-access-token";
    urlObj.password = credentials;
    return urlObj.toString();
  } catch (_e) {
    // Fallback: manual replacement if URL parsing fails
    return repositoryUrl.replace(
      /^https:\/\//,
      `https://x-access-token:${credentials}@`
    );
  }
}
