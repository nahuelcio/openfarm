import type { SynthesizedData } from "../types/index.js";

export class AgentsFormatter {
  format(data: SynthesizedData): string {
    const { context, guidelines, conventions } = data;

    const lines: string[] = [];

    lines.push(`# ${this.escape(context.projectName)} - Agent Instructions`);
    lines.push("");
    lines.push("## Core Rules");
    lines.push("");
    for (const rule of guidelines.coreRules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
    lines.push("## Personality");
    lines.push("");
    lines.push(`- **Tone:** ${guidelines.personality.tone}`);
    lines.push(
      `- **Communication:** ${guidelines.personality.communicationStyle}`
    );
    lines.push(`- **Values:** ${guidelines.personality.values.join(", ")}`);
    lines.push("");
    lines.push("## Expertise");
    lines.push("");
    for (const exp of guidelines.expertise) {
      lines.push(`- ${exp}`);
    }
    lines.push("");
    lines.push("## Philosophy");
    lines.push("");
    for (const principle of guidelines.principles) {
      lines.push(`- **${principle.title}:** ${principle.description}`);
    }
    lines.push("");
    lines.push("## OpenFarm Principles");
    lines.push("");
    lines.push("### Package Architecture");
    lines.push("");
    lines.push(
      `- **Base structure:** ${context.architecture.pattern === "monorepo" ? "packages/" : "Single package"}`
    );
    lines.push(
      `- **Pattern:** ${context.architecture.keyPatterns.join(", ") || "Standard TypeScript project"}`
    );
    lines.push(`- **Coupling:** ${context.architecture.couplingLevel}`);
    if (
      context.architecture.layering &&
      context.architecture.layering.length > 0
    ) {
      lines.push(`- **Layers:** ${context.architecture.layering.join(" → ")}`);
    }
    lines.push("");
    lines.push("### Testing & Quality");
    lines.push("");
    lines.push(`- **Framework:** ${conventions.testingConventions.framework}`);
    lines.push(`- **Pattern:** ${conventions.testingConventions.pattern}`);
    lines.push(
      `- **Coverage target:** ${conventions.testingConventions.coverageTarget}%`
    );
    lines.push("");
    lines.push("### Code Style");
    lines.push("");
    lines.push(`- **Formatting:** ${conventions.codeStyle.formatting}`);
    lines.push(`- **Linting:** ${conventions.codeStyle.linting}`);
    lines.push(`- **TypeScript:** ${conventions.codeStyle.typescriptLevel}`);
    lines.push(`- **Documentation:** ${conventions.codeStyle.documentation}`);
    lines.push("");
    lines.push("### Naming Conventions");
    lines.push("");
    for (const naming of conventions.namingConventions) {
      lines.push(`- **${naming.scope}:** \`${naming.pattern}\``);
      for (const example of naming.examples) {
        lines.push(`  - Example: \`${example}\``);
      }
    }
    lines.push("");
    lines.push("### Commit Standards");
    lines.push("");
    lines.push(`- **Format:** \`${conventions.commitStandards.format}\``);
    lines.push(
      `- **Types:** ${conventions.commitStandards.allowedTypes.join(", ")}`
    );
    lines.push("");
    lines.push("## Architecture Rules");
    lines.push("");
    for (const rule of conventions.architectureRules) {
      lines.push(`### ${rule.priority.toUpperCase()}: ${rule.rule}`);
      lines.push(`**Rationale:** ${rule.rationale}`);
      if (rule.examples.length > 0) {
        lines.push("**Examples:**");
        for (const example of rule.examples) {
          lines.push(`- ${example}`);
        }
      }
      lines.push("");
    }
    lines.push("");
    lines.push("## Quick Reference");
    lines.push("");
    lines.push("| When | Do This | Why |");
    lines.push("|------|---------|-----|");
    for (const ref of guidelines.quickReference || []) {
      lines.push(`| ${ref.scenario} | ${ref.action} | ${ref.rationale} |`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("*This file is auto-generated. Edit with care.*");

    return lines.join("\n");
  }

  private escape(text: string): string {
    return text.replace(/[#*_]/g, "\\$&");
  }
}
