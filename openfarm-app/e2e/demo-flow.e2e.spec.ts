import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		window.localStorage.clear();
	});
	await page.reload();
});

test("creates an agent from the dialog", async ({ page }) => {
	await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible();
	await page.locator("header").getByRole("button", { name: "New agent" }).click();
	await expect(page.getByText("Deploy New Agent")).toBeVisible();

	await page
		.getByPlaceholder("Describe what the agent should do...")
		.fill("Implement a basic login form");
	await page
		.getByPlaceholder("/absolute/path/to/repo")
		.fill("/tmp/openfarm-e2e-repo");
	await page.getByRole("button", { name: "Deploy Agent" }).click();

	await expect(
		page.getByRole("heading", { name: "Implement a basic login form" }),
	).toBeVisible();
	await expect(page.getByText("Starting task in web fallback mode.")).toBeVisible();
});

test("sends a follow-up message in agent chat", async ({ page }) => {
	await page.locator("header").getByRole("button", { name: "New agent" }).click();
	await page
		.getByPlaceholder("Describe what the agent should do...")
		.fill("Add unit tests for auth middleware");
	await page
		.getByPlaceholder("/absolute/path/to/repo")
		.fill("/tmp/openfarm-e2e-repo");
	await page.getByRole("button", { name: "Deploy Agent" }).click();

	await page.getByPlaceholder("Ask the agent anything...").fill("Also cover error paths");
	await page.getByRole("button", { name: "Send message" }).click();

	await expect(page.getByText("Also cover error paths")).toBeVisible();
	await expect(
		page.getByText("Web fallback response: message received."),
	).toBeVisible();
});
