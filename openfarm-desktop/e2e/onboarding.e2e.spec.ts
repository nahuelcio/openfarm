import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		window.localStorage.clear();
	});
	await page.reload();
});

test("creates project, workspace and task from a non-technical flow", async ({
	page,
}) => {
	await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

	await page.getByRole("button", { name: "Proyectos", exact: true }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Proyectos" }),
	).toBeVisible();

	await page.getByPlaceholder("Nombre del proyecto").fill("OpenFarm QA");
	await page
		.getByPlaceholder("Ruta de la carpeta del proyecto")
		.fill("/tmp/openfarm-qa");
	await page.getByRole("button", { name: "Guardar Proyecto" }).click();

	await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

	await page.getByRole("button", { name: "Mis espacios", exact: true }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Espacios de Trabajo" }),
	).toBeVisible();

	await page.getByPlaceholder("Nombre (ej: Tienda Web)").fill("Workspace QA");
	await page.getByRole("button", { name: "Continuar" }).click();
	await page
		.getByPlaceholder("Ruta de la carpeta del proyecto")
		.fill("/tmp/openfarm-qa");
	await page.getByRole("button", { name: "Continuar" }).click();
	await page.getByRole("button", { name: "Crear Espacio" }).click();

	await expect(page.getByText("Workspace QA (active)")).toBeVisible();
	await page.getByRole("button", { name: "Trabajar Aquí" }).first().click();

	await expect(
		page.getByRole("heading", { name: "Crear Nueva Tarea" }),
	).toBeVisible();
	await page
		.getByLabel("¿Qué querés que haga el asistente?")
		.fill("crear una pantalla de bienvenida clara");
	await page.getByRole("button", { name: "Iniciar Tarea" }).click();

	await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
	await expect(page.getByText("crear una pantalla de bienvenida clara")).toBeVisible();
});
