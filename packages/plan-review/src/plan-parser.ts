import type { Plan } from "./types";
import { PlanSchema } from "./types";

export interface ParsedPlan {
	title: string;
	description: string;
	steps: ParsedStep[];
	metadata?: Record<string, unknown>;
}

export interface ParsedStep {
	order: number;
	title: string;
	description: string;
	dependencies?: string[];
	status?: "pending" | "completed" | "skipped";
}

export class PlanParser {
	static parseMarkdown(markdown: string): Plan {
		const lines = markdown.split("\n");
		const parsed = PlanParser.parseMarkdownLines(lines);
		return PlanParser.convertToPlan(parsed);
	}

	static parseText(text: string): Plan {
		// Try markdown first, fallback to simple text parsing
		try {
			return PlanParser.parseMarkdown(text);
		} catch {
			return PlanParser.parseSimpleText(text);
		}
	}

	private static parseMarkdownLines(lines: string[]): ParsedPlan {
		const plan: ParsedPlan = {
			title: "Untitled Plan",
			description: "",
			steps: [],
			metadata: {},
		};

		let currentStep: Partial<ParsedStep> | null = null;
		let currentSection = "header";
		let stepOrder = 1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (!line) continue;

			// Header parsing
			if (line.startsWith("# ")) {
				plan.title = line.substring(2).trim();
				currentSection = "description";
				continue;
			}

			if (line.startsWith("## ")) {
				currentSection = line.substring(3).trim().toLowerCase();
				continue;
			}

			// Step parsing
			if (line.match(/^\d+\.?\s+/) || line.match(/^-\s+/)) {
				if (currentStep) {
					plan.steps.push(PlanParser.finalizeStep(currentStep, stepOrder++));
				}
				currentStep = PlanParser.parseStepLine(line);
				currentSection = "steps";
				continue;
			}

			// Dependencies
			if (line.startsWith("Dependencies:") || line.startsWith("Deps:")) {
				if (currentStep) {
					const deps = line
						.split(":")[1]
						.split(",")
						.map((d) => d.trim())
						.filter((d) => d);
					currentStep.dependencies = deps;
				}
				continue;
			}

			// Content parsing based on section
			switch (currentSection) {
				case "description":
					plan.description += (plan.description ? " " : "") + line;
					break;
				case "steps":
					if (currentStep && line) {
						currentStep.description = `${currentStep.description || ""} ${line}`;
					}
					break;
			}
		}

		// Add the last step if exists
		if (currentStep) {
			plan.steps.push(PlanParser.finalizeStep(currentStep, stepOrder));
		}

		return plan;
	}

	private static parseStepLine(line: string): Partial<ParsedStep> {
		const stepMatch = line.match(/^(\d+\.?\s+)?(.+)$/);
		if (!stepMatch) return {};

		const title = stepMatch[2].replace(/^[-*]\s*/, "").trim();

		return {
			title,
			description: "",
			status: "pending",
		};
	}

	private static finalizeStep(
		step: Partial<ParsedStep>,
		order: number,
	): ParsedStep {
		return {
			order,
			title: step.title || "Untitled Step",
			description: step.description || "",
			dependencies: step.dependencies,
			status: step.status || "pending",
		};
	}

	private static parseSimpleText(text: string): Plan {
		const lines = text.split("\n").filter((line) => line.trim());

		if (lines.length === 0) {
			return PlanParser.createEmptyPlan();
		}

		const steps: ParsedStep[] = lines.map((line, index) => ({
			order: index + 1,
			title: line.trim(),
			description: "",
			status: "pending" as const,
		}));

		const parsed: ParsedPlan = {
			title: "Text-based Plan",
			description: `Plan with ${steps.length} steps parsed from text`,
			steps,
		};

		return PlanParser.convertToPlan(parsed);
	}

	private static convertToPlan(parsed: ParsedPlan): Plan {
		const plan: Plan = {
			id: PlanParser.generateId(),
			title: parsed.title,
			description: parsed.description,
			steps: parsed.steps.map((step) => ({
				id: PlanParser.generateId(),
				order: step.order,
				title: step.title,
				description: step.description,
				status: step.status || "pending",
				dependencies: step.dependencies,
			})),
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
			metadata: parsed.metadata,
		};

		return PlanSchema.parse(plan);
	}

	private static createEmptyPlan(): Plan {
		const plan: Plan = {
			id: PlanParser.generateId(),
			title: "Empty Plan",
			description: "No plan content provided",
			steps: [],
			status: "pending",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return PlanSchema.parse(plan);
	}

	static generateId(): string {
		return (
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
		);
	}

	static validatePlan(plan: unknown): Plan {
		return PlanSchema.parse(plan);
	}

	static extractPlanFromAgentOutput(output: string): Plan | null {
		// Look for plan sections in agent output
		const planPatterns = [
			/## Implementation Plan[\s\S]*?(?=##|$)/i,
			/## Plan[\s\S]*?(?=##|$)/i,
			/# Plan[\s\S]*?(?=#|$)/i,
			/Plan:([\s\S]*?)(?=\n\n|\n#|$)/i,
		];

		for (const pattern of planPatterns) {
			const match = output.match(pattern);
			if (match) {
				try {
					return PlanParser.parseText(match[0]);
				} catch {}
			}
		}

		// Try to parse the entire output as a plan
		try {
			return PlanParser.parseText(output);
		} catch {
			return null;
		}
	}

	static planToMarkdown(plan: Plan): string {
		let markdown = `# ${plan.title}\n\n`;

		if (plan.description) {
			markdown += `${plan.description}\n\n`;
		}

		markdown += "## Implementation Steps\n\n";

		plan.steps.forEach((step) => {
			markdown += `${step.order}. ${step.title}\n`;

			if (step.description) {
				markdown += `   ${step.description}\n`;
			}

			if (step.dependencies && step.dependencies.length > 0) {
				markdown += `   Dependencies: ${step.dependencies.join(", ")}\n`;
			}

			markdown += "\n";
		});

		return markdown;
	}

	static planToJson(plan: Plan): string {
		return JSON.stringify(plan, null, 2);
	}

	static planFromJson(json: string): Plan {
		const parsed = JSON.parse(json);
		return PlanParser.validatePlan(parsed);
	}
}
