/**
 * Type of question for user interaction
 */
export enum QuestionType {
  INFO = "info",
  CONFIRMATION = "confirmation",
  CHOICE = "choice",
  TEXT = "text",
}

/**
 * Role in a chat message
 */
export enum ChatRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

/**
 * Work item type values (used for branch naming)
 */
export enum WorkItemType {
  BUG = "bug",
  TASK = "task",
  USER_STORY = "user story",
  FEATURE = "feature",
}

/**
 * Branch prefix for work item types
 */
export enum BranchPrefix {
  FIX = "fix",
  FEATURE = "feature",
}

/**
 * Behavior when max iterations/rounds are reached
 */
export enum MaxRoundsBehavior {
  ASK_USER = "ask_user",
  FAIL = "fail",
}

/**
 * Opencode event types
 */
export enum OpencodeEventType {
  TEXT = "text",
}

/**
 * Threshold in minutes after which a workflow execution is considered stale
 * Executions not updated within this time are considered stale and can be marked as failed
 */
export const STALE_THRESHOLD_MINUTES = 5;
