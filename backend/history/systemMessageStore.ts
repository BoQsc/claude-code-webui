/**
 * System Message Store
 * Handles persistence of system messages that Claude CLI doesn't store in conversation history
 * This ensures conversation continuity when reloading pages
 */

import type { SDKMessage } from "@anthropic-ai/claude-code";
import { logger } from "../utils/logger.ts";
import { readTextFile, writeTextFile, exists } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";

/**
 * Stored system message format
 */
interface StoredSystemMessage {
  sessionId: string;
  timestamp: string;
  message: SDKMessage;
  /** Position in the original conversation flow */
  position: number;
  /** Type of system message for categorization */
  messageType: string;
}

/**
 * Get the system messages file path for a project and session
 */
function getSystemMessagesFilePath(encodedProjectName: string, sessionId: string): string {
  const homeDir = getHomeDir();
  if (!homeDir) {
    throw new Error("Home directory not found");
  }
  return `${homeDir}/.claude/projects/${encodedProjectName}/${sessionId}_system.jsonl`;
}

/**
 * Store a system message during streaming
 */
export async function storeSystemMessage(
  encodedProjectName: string,
  sessionId: string,
  message: SDKMessage,
  position: number,
  messageType?: string,
): Promise<void> {
  if (message.type !== "system") {
    return; // Only store system messages
  }

  try {
    const filePath = getSystemMessagesFilePath(encodedProjectName, sessionId);

    const storedMessage: StoredSystemMessage = {
      sessionId,
      timestamp: new Date().toISOString(),
      message,
      position,
      messageType: messageType || message.type || "system",
    };

    const jsonLine = JSON.stringify(storedMessage) + "\n";

    // Append to the system messages file
    if (await exists(filePath)) {
      const existingContent = await readTextFile(filePath);
      await writeTextFile(filePath, existingContent + jsonLine);
    } else {
      await writeTextFile(filePath, jsonLine);
    }

    logger.history.debug(
      `Stored system message for session ${sessionId}, position ${position}, type: ${messageType}`,
    );
  } catch (error) {
    logger.history.error(
      "Failed to store system message: {error}",
      { error },
    );
  }
}

/**
 * Load stored system messages for a session
 */
export async function loadSystemMessages(
  encodedProjectName: string,
  sessionId: string,
): Promise<StoredSystemMessage[]> {
  try {
    const filePath = getSystemMessagesFilePath(encodedProjectName, sessionId);

    if (!(await exists(filePath))) {
      return []; // No system messages stored
    }

    const content = await readTextFile(filePath);
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    const systemMessages: StoredSystemMessage[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as StoredSystemMessage;

        // System messages are already filtered by being in the correct file
        // No additional session validation needed since file path contains the session ID
        logger.history.debug(
          `Loading stored system message from file for session: ${sessionId}`,
        );

        systemMessages.push(parsed);
      } catch (parseError) {
        logger.history.error(
          `Failed to parse system message line in ${filePath}: {error}`,
          { error: parseError },
        );
      }
    }

    // Sort by position to maintain order
    systemMessages.sort((a, b) => a.position - b.position);

    logger.history.debug(
      `Loaded ${systemMessages.length} system messages for session ${sessionId}`,
    );

    return systemMessages;
  } catch (error) {
    logger.history.error(
      "Failed to load system messages: {error}",
      { error },
    );
    return [];
  }
}

/**
 * Merge system messages back into conversation timeline
 * This is called when loading conversation history to restore the complete conversation state
 */
export async function mergeSystemMessagesIntoHistory(
  encodedProjectName: string,
  sessionId: string,
  conversationMessages: unknown[],
): Promise<unknown[]> {
  try {
    logger.history.debug(
      `🔧 mergeSystemMessagesIntoHistory called for project: ${encodedProjectName}, session: ${sessionId}`,
    );
    logger.history.debug(
      `🔧 Input conversation has ${conversationMessages.length} messages`,
    );

    // Extract all unique session IDs from the conversation messages
    const sessionIds = new Set<string>();
    sessionIds.add(sessionId); // Always include the primary session ID

    // Look for session_id fields in all messages to find related sessions
    for (const message of conversationMessages) {
      if (typeof message === 'object' && message !== null) {
        const messageObj = message as any;
        if (messageObj.session_id && typeof messageObj.session_id === 'string') {
          sessionIds.add(messageObj.session_id);
        }
      }
    }

    logger.history.debug(
      `🔧 Loading system messages for ${sessionIds.size} sessions: ${Array.from(sessionIds).join(', ')}`,
    );

    // Load system messages for all found session IDs
    const allSystemMessages: StoredSystemMessage[] = [];
    for (const sid of sessionIds) {
      const sessionSystemMessages = await loadSystemMessages(encodedProjectName, sid);
      logger.history.debug(
        `🔧 Loaded ${sessionSystemMessages.length} system messages for session ${sid}`,
      );
      allSystemMessages.push(...sessionSystemMessages);
    }

    // Sort system messages by position and then by timestamp for consistent ordering
    allSystemMessages.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    logger.history.debug(
      `🔧 Total loaded ${allSystemMessages.length} system messages from all sessions`,
    );

    const systemMessages = allSystemMessages;

    if (systemMessages.length === 0) {
      logger.history.debug(
        `🔧 No system messages to merge for session ${sessionId}`,
      );
      return conversationMessages; // No system messages to merge
    }

    // Create a copy of the conversation messages to avoid mutation
    const result = [...conversationMessages];

    // Insert system messages at their chronologically correct positions
    for (const stored of systemMessages) {
      // Add timestamp to the system message for frontend compatibility
      const messageWithTimestamp = {
        ...stored.message,
        timestamp: stored.timestamp, // Use the stored timestamp
      };

      // Find the correct chronological position based on timestamp
      const messageTimestamp = new Date(stored.timestamp).getTime();
      let insertPosition = result.length; // Default to end

      // Find where this message should be inserted chronologically
      for (let i = 0; i < result.length; i++) {
        const currentMessage = result[i] as any;
        const currentTimestamp = currentMessage.timestamp
          ? new Date(currentMessage.timestamp).getTime()
          : 0;

        if (messageTimestamp <= currentTimestamp) {
          insertPosition = i;
          break;
        }
      }

      logger.history.debug(
        `🔧 Inserting system message at chronological position ${insertPosition}: ${JSON.stringify(messageWithTimestamp).substring(0, 100)}...`,
      );

      // Insert the system message at the correct chronological position
      result.splice(insertPosition, 0, messageWithTimestamp);
    }

    logger.history.debug(
      `🔧 Successfully merged ${systemMessages.length} system messages into conversation history for session ${sessionId}`,
    );
    logger.history.debug(
      `🔧 Final result has ${result.length} messages`,
    );

    return result;
  } catch (error) {
    logger.history.error(
      "Failed to merge system messages into history: {error}",
      { error },
    );
    return conversationMessages; // Return original messages on error
  }
}

/**
 * Clean up old system message files to prevent disk space issues
 * Should be called periodically or when conversation files are cleaned up
 */
export async function cleanupSystemMessages(
  encodedProjectName: string,
  sessionId: string,
): Promise<void> {
  try {
    const filePath = getSystemMessagesFilePath(encodedProjectName, sessionId);

    if (await exists(filePath)) {
      // In a real implementation, you might want to use a proper file deletion function
      // For now, we'll just log that cleanup is needed
      logger.history.debug(
        `System messages file exists for cleanup: ${filePath}`,
      );
    }
  } catch (error) {
    logger.history.error(
      "Failed to cleanup system messages: {error}",
      { error },
    );
  }
}