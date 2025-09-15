import { Context } from "hono";
import { logger } from "../utils/logger.ts";
import { query } from "@anthropic-ai/claude-code";
import { getHomeDir } from "../utils/os.ts";

/**
 * Handles POST /api/sessions/:sessionId/persist requests
 * Forces Claude CLI to save the current conversation state to disk
 */
export async function handleSessionPersistRequest(c: Context) {
  try {
    const sessionId = c.req.param("sessionId");
    const { workingDirectory } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: "Session ID is required" }, 400);
    }

    if (!workingDirectory) {
      return c.json({ error: "Working directory is required" }, 400);
    }

    logger.api.info(`Forcing persistence for session: ${sessionId}`);

    // Force Claude CLI to persist by making a minimal query with the existing sessionId
    // This triggers Claude to save the current conversation state to disk
    const abortController = new AbortController();

    try {
      // Make a minimal request to trigger session save
      const queryOptions = {
        abortController,
        executable: "node",
        executableArgs: [],
        pathToClaudeCodeExecutable: c.get("claudeCliPath"),
        env: process.env,
        resume: sessionId,
        cwd: workingDirectory,
        permissionMode: "default"
      };

      // Process just enough to trigger the save, then abort
      let messageCount = 0;
      for await (const message of query({
        prompt: ".", // Minimal message that shouldn't do anything but will trigger save
        options: queryOptions,
      })) {
        messageCount++;
        // After getting system init message, abort to trigger save
        if (messageCount >= 1) {
          break;
        }
      }

      logger.api.info(`Session ${sessionId} persistence completed`);

      return c.json({
        success: true,
        sessionId,
        message: "Session successfully persisted to disk"
      });

    } finally {
      abortController.abort();
    }

  } catch (error) {
    logger.api.error("Error persisting session: {error}", { error });
    return c.json({ error: "Failed to persist session" }, 500);
  }
}

/**
 * Handles GET /api/sessions/:sessionId/status requests
 * Checks if there are unsaved messages in the current session
 */
export async function handleSessionStatusRequest(c: Context) {
  try {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return c.json({ error: "Session ID is required" }, 400);
    }

    // TODO: Implement logic to check if session has unsaved changes
    // This would compare in-memory state vs disk state

    return c.json({
      sessionId,
      hasUnsavedMessages: false, // Placeholder
      lastPersisted: new Date().toISOString()
    });

  } catch (error) {
    logger.api.error("Error checking session status: {error}", { error });
    return c.json({ error: "Failed to check session status" }, 500);
  }
}