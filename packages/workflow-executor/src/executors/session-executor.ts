/**
 * Session Executor
 *
 * Executes session-related actions for task-loop workflows:
 * - session.create: Create new session
 * - session.update: Update session state
 * - session.log: Add log entry to session
 */

import { StepAction } from "@openfarm/core/constants/actions";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";

/**
 * Session state
 */
interface SessionState {
  id: string;
  status: "running" | "paused" | "completed" | "failed";
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Executes session.create action - creates new session
 */
async function executeSessionCreate(
  request: StepExecutionRequest
): Promise<Result<SessionState>> {
  const { step, logger } = request;
  const config = step.config || {};

  const sessionId = config.sessionId as string | undefined;
  const id =
    sessionId ||
    `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  await logger(`Creating session: ${id}`);

  const session: SessionState = {
    id,
    status: "running",
    completedTasks: 0,
    failedTasks: 0,
    skippedTasks: 0,
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await logger(`Session created: ${id}`);
  return ok(session);
}

/**
 * Executes session.update action - updates session state
 */
async function executeSessionUpdate(
  request: StepExecutionRequest
): Promise<Result<SessionState>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const session = context.workflowVariables?.session as
    | SessionState
    | undefined;

  if (!session) {
    return err(new Error("No session found in context"));
  }

  const status = config.status as SessionState["status"] | undefined;
  const completedTasks = config.completedTasks as number | undefined;
  const failedTasks = config.failedTasks as number | undefined;
  const skippedTasks = config.skippedTasks as number | undefined;

  await logger(`Updating session: ${session.id}`);

  const updated: SessionState = {
    ...session,
    status: status || session.status,
    completedTasks: completedTasks ?? session.completedTasks,
    failedTasks: failedTasks ?? session.failedTasks,
    skippedTasks: skippedTasks ?? session.skippedTasks,
    updatedAt: new Date().toISOString(),
  };

  await logger(`Session updated: ${updated.id}`);
  return ok(updated);
}

/**
 * Executes session.log action - adds log entry to session
 */
async function executeSessionLog(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const session = context.workflowVariables?.session as
    | SessionState
    | undefined;

  if (!session) {
    return err(new Error("No session found in context"));
  }

  const message = config.message as string;

  if (!message) {
    return err(new Error("Message is required"));
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;

  session.logs.push(logEntry);
  session.updatedAt = timestamp;

  await logger(logEntry);
  return ok(logEntry);
}

/**
 * Routes session actions to the appropriate executor
 */
export async function executeSessionAction(
  request: StepExecutionRequest
): Promise<Result<unknown>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.SESSION_CREATE) {
    return executeSessionCreate(request);
  }
  if (action === StepAction.SESSION_UPDATE) {
    return executeSessionUpdate(request);
  }
  if (action === StepAction.SESSION_LOG) {
    return executeSessionLog(request);
  }

  return err(new Error(`Unknown session action: ${action}`));
}
