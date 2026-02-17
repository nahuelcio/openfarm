/**
 * Configuration Structure Tests
 *
 * Unit tests for unified YAML configuration file structure and parsing.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { TaskLoopYamlConfig } from "./config-types";

const CONFIG_DIR = join(__dirname, "../config");
const CONFIG_FILE = join(CONFIG_DIR, "task-loop.yaml");

describe("Unified YAML Configuration", () => {
	it("should exist", () => {
		expect(existsSync(CONFIG_FILE)).toBe(true);
	});

	it("should have valid YAML syntax", () => {
		const content = readFileSync(CONFIG_FILE, "utf-8");
		expect(() => parseYaml(content)).not.toThrow();
	});

	it("should have all top-level sections", () => {
		const content = readFileSync(CONFIG_FILE, "utf-8");
		const config = parseYaml(content) as TaskLoopYamlConfig;

		expect(config).toHaveProperty("selection");
		expect(config).toHaveProperty("prompts");
		expect(config).toHaveProperty("completion");
		expect(config).toHaveProperty("workflows");
	});

	describe("selection section", () => {
		it("should have all required fields", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.selection).toHaveProperty("strategies");
			expect(config.selection).toHaveProperty("priorityScores");
			expect(config.selection).toHaveProperty("defaultStrategy");
		});

		it("should define all selection strategies", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.selection.strategies).toHaveProperty("priority");
			expect(config.selection.strategies).toHaveProperty("fifo");
			expect(config.selection.strategies).toHaveProperty("lifo");
			expect(config.selection.strategies).toHaveProperty("random");
		});

		it("should define priority scores for all levels", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.selection.priorityScores).toHaveProperty("critical");
			expect(config.selection.priorityScores).toHaveProperty("high");
			expect(config.selection.priorityScores).toHaveProperty("medium");
			expect(config.selection.priorityScores).toHaveProperty("low");
		});
	});

	describe("prompts section", () => {
		it("should have all required fields", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.prompts).toHaveProperty("defaultTemplate");
			expect(config.prompts).toHaveProperty("templates");
		});

		it("should define default, simple, and detailed templates", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.prompts.templates).toHaveProperty("default");
			expect(config.prompts.templates).toHaveProperty("simple");
			expect(config.prompts.templates).toHaveProperty("detailed");
		});

		it("should have template content and variables", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			const defaultTemplate = config.prompts.templates.default;
			expect(defaultTemplate).toHaveProperty("name");
			expect(defaultTemplate).toHaveProperty("description");
			expect(defaultTemplate).toHaveProperty("content");
			expect(defaultTemplate).toHaveProperty("variables");
			expect(Array.isArray(defaultTemplate.variables)).toBe(true);
		});
	});

	describe("completion section", () => {
		it("should have all required fields", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.completion).toHaveProperty("strategies");
			expect(config.completion).toHaveProperty("defaultStrategy");
		});

		it("should define all completion strategies", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.completion.strategies).toHaveProperty("heuristic");
			expect(config.completion.strategies).toHaveProperty("gitChanges");
			expect(config.completion.strategies).toHaveProperty("llmJudge");
		});

		it("should have completion and failure markers for heuristic strategy", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			const heuristic = config.completion.strategies.heuristic;
			expect(heuristic).toHaveProperty("completionMarkers");
			expect(heuristic).toHaveProperty("failureMarkers");
			expect(heuristic).toHaveProperty("fatalErrorPatterns");
			expect(Array.isArray(heuristic.completionMarkers)).toBe(true);
			expect(Array.isArray(heuristic.failureMarkers)).toBe(true);
			expect(Array.isArray(heuristic.fatalErrorPatterns)).toBe(true);
		});
	});

	describe("workflows section", () => {
		it("should have all required fields", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(config.workflows).toHaveProperty("defaultWorkflow");
			expect(config.workflows).toHaveProperty("taskExecutionWorkflow");
			expect(config.workflows).toHaveProperty("gitSetupWorkflow");
			expect(config.workflows).toHaveProperty("workflowOverrides");
		});

		it("should define workflow overrides", () => {
			const content = readFileSync(CONFIG_FILE, "utf-8");
			const config = parseYaml(content) as TaskLoopYamlConfig;

			expect(typeof config.workflows.workflowOverrides).toBe("object");
			expect(
				Object.keys(config.workflows.workflowOverrides).length,
			).toBeGreaterThan(0);
		});
	});
});
