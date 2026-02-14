import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		window.localStorage.clear();
	});
	await page.reload();
});

test("navigates key views and manages an MCP connection", async ({ page }) => {
	await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

	await page.getByRole("button", { name: "Ejecuciones", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Ejecuciones" })).toBeVisible();
	await expect(
		page.getByText("Todavía no hay espacios de trabajo."),
	).toBeVisible();
	await page.getByRole("button", { name: "Volver" }).click();

	await page
		.getByRole("button", { name: "Tareas guardadas", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { level: 1, name: /Tareas Guardadas -/ }),
	).toBeVisible();
	await page.getByRole("button", { name: "Volver" }).click();

	await page.getByRole("button", { name: "Conexiones", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Conexiones Externas (MCP)" }),
	).toBeVisible();

	await page.getByPlaceholder("Nombre").fill("Filesystem MCP");
	await page.getByPlaceholder("Comando (ej: npx)").fill("npx");
	await page
		.getByPlaceholder("Argumentos (separados por espacios)")
		.fill("-y @modelcontextprotocol/server-filesystem /tmp");
	await page.getByRole("button", { name: "Guardar Conexión" }).click();

	await expect(page.getByText("Filesystem MCP (activa)")).toBeVisible();
	await page.getByRole("button", { name: "Desactivar" }).click();
	await expect(page.getByText("Filesystem MCP (inactiva)")).toBeVisible();

	await page.getByRole("button", { name: "Eliminar" }).click();
	await expect(
		page.getByText("Todavía no configuraste conexiones."),
	).toBeVisible();
	await page.getByRole("button", { name: "Volver" }).click();

	await page.getByRole("button", { name: "Ajustes", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Settings / Control Center" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Detect", exact: true }).first(),
	).toBeVisible();
	await page.getByRole("button", { name: "Volver" }).click();

	await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
});
