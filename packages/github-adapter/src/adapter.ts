import type {
	CreatePRParams,
	Integration,
	PlatformAdapter,
} from "@openfarm/core/types/adapters";
import type { WorkItem } from "@openfarm/core/types/domain";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";

const defaultFetch = async (
	url: string,
	options?: RequestInit,
): Promise<Response> => {
	return fetch(url, options);
};

export class GitHubPlatformAdapter implements PlatformAdapter {
	constructor(
		private readonly integration: Integration,
		private readonly owner: string,
		private readonly repo: string,
	) {}

	getName(): string {
		return `GitHub (${this.owner}/${this.repo})`;
	}

	async testConnection(): Promise<Result<boolean>> {
		try {
			const response = await defaultFetch(
				`https://api.github.com/repos/${this.owner}/${this.repo}`,
				{
					headers: {
						Authorization: `Bearer ${this.integration.credentials}`,
						Accept: "application/vnd.github.v3+json",
					},
				},
			);

			if (response.ok) {
				return ok(true);
			}

			return err(new Error(`GitHub API error: ${response.status}`));
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async getWorkItem(id: string): Promise<Result<WorkItem>> {
		try {
			const response = await defaultFetch(
				`https://api.github.com/repos/${this.owner}/${this.repo}/issues/${id}`,
				{
					headers: {
						Authorization: `Bearer ${this.integration.credentials}`,
						Accept: "application/vnd.github.v3+json",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				return err(
					new Error(`Failed to fetch issue: ${response.status} - ${errorText}`),
				);
			}

			const issue = (await response.json()) as {
				number: number;
				title: string;
				body: string;
				state: string;
				user?: { login: string };
				labels?: Array<{ name: string }>;
			};

			const workItem: WorkItem = {
				id: String(issue.number),
				title: issue.title,
				description: issue.body || "",
				acceptanceCriteria: "",
				workItemType: "Issue",
				source: "github",
				status: issue.state === "open" ? "new" : "completed",
				project: this.repo,
				tags: issue.labels?.map((l) => l.name) || [],
				state: issue.state,
				assignee: issue.user
					? { id: issue.user.login, name: issue.user.login }
					: undefined,
			};

			return ok(workItem);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async createPullRequest(params: CreatePRParams): Promise<Result<string>> {
		try {
			const response = await defaultFetch(
				`https://api.github.com/repos/${this.owner}/${this.repo}/pulls`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.integration.credentials}`,
						Accept: "application/vnd.github.v3+json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						title: params.title,
						body: params.description,
						head: params.source,
						base: params.target,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				return err(
					new Error(`Failed to create PR: ${response.status} - ${errorText}`),
				);
			}

			const pr = (await response.json()) as { html_url: string };
			logger().info(
				{ prUrl: pr.html_url },
				"Successfully created GitHub pull request",
			);
			return ok(pr.html_url);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async postComment(id: string, text: string): Promise<Result<void>> {
		try {
			const response = await defaultFetch(
				`https://api.github.com/repos/${this.owner}/${this.repo}/issues/${id}/comments`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.integration.credentials}`,
						Accept: "application/vnd.github.v3+json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ body: text }),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				return err(
					new Error(
						`Failed to post comment: ${response.status} - ${errorText}`,
					),
				);
			}

			logger().info(
				{ issueId: id },
				"Successfully posted comment to GitHub issue",
			);
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
