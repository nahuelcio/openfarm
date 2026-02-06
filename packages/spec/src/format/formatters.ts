import type { SpecArtifacts } from "../types";

export interface ProposalTemplateInput {
  name: string;
  description: string;
}

export function formatProposal(input: ProposalTemplateInput): string {
  return `# Proposal: ${input.name}

## Problem

${input.description}

## Solution

- Define an incremental and verifiable solution.
- Keep changes surgical and compatible with the current repository.

## Success Criteria

- [ ] The problem is solved without breaking existing flows.
- [ ] The change has appropriate test coverage.
`;
}

export function formatRequirements(input: ProposalTemplateInput): string {
  return `# Requirements

## Functional

- [F1] **MUST**: Implement behavior for "${input.name}".
- [F2] **MUST**: Expose a stable and documented CLI interface.

## Non-Functional

- [NF1] **MUST**: Keep compatibility with the current workspace structure.
- [NF2] **SHOULD**: Minimize complexity and new dependencies.

## Out of Scope

- Features not requested in this iteration.
`;
}

export function formatDesign(input: ProposalTemplateInput): string {
  return `# Design

## Approach

- Incremental implementation for "${input.name}".
- Use existing components when possible.

## Architecture

1. Detect local project context.
2. Apply minimal changes at existing extension points.
3. Validate with tests and linting.
`;
}

export function formatTasks(_input: ProposalTemplateInput): string {
  return `# Tasks

## Phase 1: Setup

- [ ] Define data contract and file structure.
- [ ] Implement core commands and flows.

## Phase 2: Validation

- [ ] Add unit tests and basic integration coverage.
- [ ] Run lint and fix issues.
`;
}

export function normalizeArtifacts(
  artifacts: Partial<SpecArtifacts>
): SpecArtifacts {
  return {
    proposal: artifacts.proposal ?? "",
    requirements: artifacts.requirements ?? "",
    design: artifacts.design ?? "",
    tasks: artifacts.tasks ?? "",
  };
}
