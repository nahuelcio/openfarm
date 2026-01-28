import { BranchPrefix, WorkItemType } from "@openfarm/core/constants/enums";
import type {
  AgentConfig,
  AgentConfiguration,
  WorkItem,
} from "@openfarm/core/types/domain";

/**
 * Generate branch name based on work item type.
 * If agentConfiguration.branchNamingPattern is provided, use it with placeholders:
 * - {type} -> work item type (lowercase)
 * - {id} -> work item ID
 */
export const getBranchName = (
  workItem: WorkItem,
  agentConfiguration?: AgentConfiguration
): string => {
  // If custom pattern is provided, use it
  if (agentConfiguration?.branchNamingPattern) {
    const type = workItem.workItemType.toLowerCase();
    return agentConfiguration.branchNamingPattern
      .replace(/{type}/g, type)
      .replace(/{id}/g, workItem.id);
  }

  // Fallback to original logic
  const type = workItem.workItemType.toLowerCase();
  const prefix =
    type === WorkItemType.BUG
      ? BranchPrefix.FIX
      : type === WorkItemType.TASK
        ? BranchPrefix.FIX
        : type === WorkItemType.USER_STORY
          ? BranchPrefix.FEATURE
          : type === WorkItemType.FEATURE
            ? BranchPrefix.FEATURE
            : BranchPrefix.FIX;
  return `${prefix}/${type}-${workItem.id}`;
};

export const getCommitMessage = (workItem: WorkItem): string => {
  const type = workItem.workItemType;
  return `Fix ${type.toLowerCase()} #${workItem.id}: ${workItem.title}`;
};

/**
 * Determine if branch should be pushed.
 * Default: true (for backward compatibility)
 */
export const shouldPushBranch = (
  agentConfiguration?: AgentConfiguration
): boolean => {
  return agentConfiguration?.pushBranch !== false;
};

/**
 * Determine if PR should be created.
 * Requires both: disablePrCreation must be false AND createPullRequest must be true
 */
export const shouldCreatePullRequest = (
  agentConfiguration: AgentConfiguration | undefined,
  disablePrCreation: boolean
): boolean => {
  return !disablePrCreation && agentConfiguration?.createPullRequest === true;
};

export const getDefaultBranch = (
  agentConfiguration?: AgentConfiguration
): string => {
  return agentConfiguration?.defaultBranch || "dev";
};

export const buildAzureConfig = (
  config: AgentConfig,
  workItem: WorkItem
): { orgUrl: string; project: string; pat: string; repoId: string } | null => {
  if (!(workItem.azureRepositoryId && workItem.azureRepositoryProject)) {
    return null;
  }
  return {
    orgUrl: config.azureOrgUrl,
    project: workItem.azureRepositoryProject,
    pat: config.azurePat,
    repoId: workItem.azureRepositoryId,
  };
};

export const getPrSkipMessage = (
  disablePrCreation: boolean,
  branchName: string,
  wasPushed: boolean
): string => {
  const action = wasPushed ? "pushed" : "committed";
  const reason = disablePrCreation
    ? "Skipping PR creation (test mode enabled)"
    : "Skipping PR creation (createPullRequest is disabled in configuration)";
  return `Branch ${branchName} ${action} successfully. ${reason}`;
};
