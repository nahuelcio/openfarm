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
}
