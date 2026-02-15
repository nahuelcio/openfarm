/**
 * Utility functions for replacing expressions in workflow templates.
 * Extracted from agent-executor.ts to reduce complexity and improve reusability.
 */

export interface WorkItemExpressions {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  id?: string;
  workItemType?: string;
  project?: string;
  mode?: string;
  preInstructions?: string;
  repositoryUrl?: string;
  branchName?: string;
  defaultBranch?: string;
  chatMessages?: string;
  sessionId?: string;
}

/**
 * Replaces workItem expressions in template strings.
 * Handles common patterns like ${workItem.title}, ${workItem.description}, etc.
 * Also handles ternary expressions like ${workItem.description ? `...` : ''}
 */
export function replaceWorkItemExpressions(
  text: string,
  workItem: WorkItemExpressions
): string {
  let result = text;

  // Direct replacements for simple expressions
  const simpleReplacements: Array<keyof WorkItemExpressions> = [
    'title', 'description', 'acceptanceCriteria', 'id', 'workItemType',
    'project', 'mode', 'preInstructions', 'repositoryUrl', 'branchName',
    'defaultBranch', 'chatMessages', 'sessionId'
  ];

  for (const prop of simpleReplacements) {
    const pattern = new RegExp(`\\$\\{workItem\\.${prop}\\}`, 'g');
    result = result.replace(pattern, workItem[prop] || "");
  }

  // Handle mode-specific ternary expressions
  result = replaceModeTernaries(result, workItem);
  
  // Handle preInstructions with default
  result = result.replace(
    /\$\{workItem\.preInstructions\|\|`.*?`\}/g,
    workItem.preInstructions || ""
  );

  // Handle description and acceptance criteria ternaries
  result = replaceDescriptionTernaries(result, workItem);
  result = replaceAcceptanceCriteriaTernaries(result, workItem);

  // Handle generic ternary expressions
  result = replaceGenericTernaries(result, workItem);

  return result;
}

function replaceModeTernaries(text: string, workItem: WorkItemExpressions): string {
  const currentMode = workItem.mode || "investigate";
  const isReadOnly = currentMode === "investigate" || currentMode === "review";

  // Complex mode ternary: ${workItem.mode ? `...` : `...`}
  const complexModeTernaryPattern = /\$\{workItem\.mode\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(complexModeTernaryPattern, (match, readOnlyMode, editMode) => {
    return isReadOnly ? readOnlyMode : editMode;
  });
}

function replaceDescriptionTernaries(text: string, workItem: WorkItemExpressions): string {
  const descriptionTernaryPattern = /\$\{workItem\.description\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(descriptionTernaryPattern, (match, hasDescription, noDescription) => {
    return workItem.description ? hasDescription : noDescription;
  });
}

function replaceAcceptanceCriteriaTernaries(text: string, workItem: WorkItemExpressions): string {
  const acceptanceTernaryPattern = /\$\{workItem\.acceptanceCriteria\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(acceptanceTernaryPattern, (match, hasCriteria, noCriteria) => {
    return workItem.acceptanceCriteria ? hasCriteria : noCriteria;
  });
}

function replaceGenericTernaries(text: string, workItem: WorkItemExpressions): string {
  const genericTernaryPattern = /\$\{workItem\.(\w+)\?\s*`([^`]+)`\s*:\s*`([^`]+)`\}/g;
  return text.replace(genericTernaryPattern, (match, prop, hasValue, noValue) => {
    const value = workItem[prop as keyof WorkItemExpressions];
    return value ? hasValue : noValue;
  });
}

export interface StepResult {
  stepId: string;
  result?: string;
}

/**
 * Replaces step result expressions in template strings.
 * Handles both formats: {stepResults.research.result} and ${stepResults.research?.result}
 */
export function replaceStepResultsExpressions(
  text: string,
  stepResults: StepResult[]
): string {
  let result = text;

  // Create a map for efficient lookup
  const stepResultsMap = new Map<string, string>();
  for (const stepResult of stepResults) {
    if (stepResult.result) {
      stepResultsMap.set(stepResult.stepId, stepResult.result);
    }
  }

  // Replace step result expressions with fallback (?.)
  const stepResultWithFallbackPattern = /\$\{stepResults\.(\w+)\?\.result\}/g;
  result = result.replace(stepResultWithFallbackPattern, (match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  // Replace step result expressions without fallback
  const stepResultPattern = /\$\{stepResults\.(\w+)\.result\}/g;
  result = result.replace(stepResultPattern, (match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  // Replace step result expressions without $ prefix
  const stepResultPatternNoDollar = /\{stepResults\.(\w+)\.result\}/g;
  result = result.replace(stepResultPatternNoDollar, (match, stepId) => {
    const stepResult = stepResultsMap.get(stepId);
    return stepResult || "";
  });

  return result;
}
