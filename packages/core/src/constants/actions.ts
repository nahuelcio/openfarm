/**
 * Type of a workflow step
 */
export enum StepType {
  GIT = "git",
  CODE = "code",
  LLM = "llm",
  COMMAND = "command",
  PLATFORM = "platform",
  PLANNING = "planning",
  HUMAN = "human",
  REVIEW = "review",
  CONDITIONAL = "conditional",
  LOOP = "loop",
  PARALLEL = "parallel",
  TASK = "task",
  PROMPT = "prompt",
  DETECTION = "detection",
  SESSION = "session",
}

/**
 * Standard actions for workflow steps
 */
export enum StepAction {
  // Git Actions
  GIT_CHECKOUT = "git.checkout",
  GIT_BRANCH = "git.branch",
  GIT_COMMIT = "git.commit",
  GIT_PUSH = "git.push",
  GIT_WORKTREE = "git.worktree",

  // Agent Actions
  AGENT_CODE = "agent.code",
  AGENT_IMPLEMENT = "agent.implement",
  AGENT_AUTHOR = "agent.author",
  AGENT_ROUTER = "agent.router",

  // Platform Actions
  PLATFORM_CREATE_PR = "platform.create_pr",
  PLATFORM_POST_COMMENT = "platform.post_comment",
  PLATFORM_PROVISION_POD = "platform.provision_pod",
  PLATFORM_DESTROY_POD = "platform.destroy_pod",

  // Command Actions
  COMMAND_EXEC = "command.exec",

  // Planning Actions
  PLANNING_PLAN = "planning.plan",

  // Human Actions
  HUMAN_APPROVAL = "human.approval",
  HUMAN_INPUT = "human.input",

  // Review Actions
  REVIEW_CODE = "review.code",

  // Task Actions (for task-loop)
  TASK_SELECT = "task.select",
  TASK_LOAD = "task.load",
  TASK_FILTER = "task.filter",
  TASK_UPDATE_STATUS = "task.update_status",

  // Prompt Actions (for task-loop)
  PROMPT_BUILD = "prompt.build",
  PROMPT_TEMPLATE = "prompt.template",

  // Detection Actions (for task-loop)
  DETECTION_CHECK_COMPLETION = "detection.check_completion",
  DETECTION_ANALYZE_OUTPUT = "detection.analyze_output",

  // Session Actions (for task-loop)
  SESSION_CREATE = "session.create",
  SESSION_UPDATE = "session.update",
  SESSION_LOG = "session.log",
}
