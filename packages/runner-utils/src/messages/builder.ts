import { defaultFileSystem } from "@openfarm/core/db/connection";
import type { AgentConfiguration, WorkItem } from "@openfarm/core/types/domain";
import type { FileSystem } from "@openfarm/core/types/runtime";
// @ts-expect-error - TODO: Move getBlockedResources to a shared package
import { getBlockedResources } from "@openfarm/agent-runner/operations/rules/blocked";
import { stripHtml } from "../utils/html";

export function buildAgentMessage(
  workItem: WorkItem,
  agentConfiguration?: AgentConfiguration,
  repoPath?: string,
  fileSystem: FileSystem = defaultFileSystem
): string {
  let blockedResourcesInstruction = "";
  if (agentConfiguration?.rules && repoPath) {
    const { blockedFiles, blockedDirs } = getBlockedResources(
      repoPath,
      agentConfiguration.rules,
      fileSystem
    );
    if (blockedFiles.length > 0 || blockedDirs.length > 0) {
      const allBlockedResources = [...blockedFiles, ...blockedDirs];
      const blockedList = allBlockedResources.slice(0, 10).join(", ");
      blockedResourcesInstruction = `\n\nIMPORTANT: DO NOT MODIFY these files/directories: ${blockedList}${allBlockedResources.length > 10 ? ", and others" : ""}`;
    }
  }

  const sanitizedDescription = stripHtml(workItem.description || "");
  const sanitizedAcceptanceCriteria = stripHtml(
    workItem.acceptanceCriteria || ""
  );
  const defaultMessage = `Fix this ${workItem.workItemType.toLowerCase()}: ${workItem.title}\n\n${sanitizedDescription}\n\nAcceptance Criteria:\n${sanitizedAcceptanceCriteria}`;

  let message = agentConfiguration?.prompt || defaultMessage;

  const preInstructions = workItem.preInstructions || "";

  if (preInstructions.trim()) {
    const sanitizedPreInstructions = stripHtml(preInstructions);
    message = `${message}\n\nAdditional Instructions:\n${sanitizedPreInstructions}`;
  }

  message = `${message}${blockedResourcesInstruction}`;

  return message;
}
