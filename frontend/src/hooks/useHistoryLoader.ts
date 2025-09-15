import { useState, useEffect, useCallback } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory } from "../../../shared/types";
import { getConversationUrl } from "../config/api";
import { useMessageConverter } from "./useMessageConverter";

interface HistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
}

interface HistoryLoaderResult extends HistoryLoaderState {
  loadHistory: (projectPath: string, sessionId: string) => Promise<void>;
  clearHistory: () => void;
}

// Type guard to check if a message is a TimestampedSDKMessage
function isTimestampedSDKMessage(
  message: unknown,
): message is TimestampedSDKMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "timestamp" in message &&
    typeof (message as { timestamp: unknown }).timestamp === "string"
  );
}

/**
 * Hook for loading and converting conversation history from the backend
 */
export function useHistoryLoader(): HistoryLoaderResult {
  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
  });

  const { convertConversationHistory } = useMessageConverter();

  const loadHistory = useCallback(
    async (encodedProjectName: string, sessionId: string) => {
      if (!encodedProjectName || !sessionId) {
        setState((prev) => ({
          ...prev,
          error: "Encoded project name and session ID are required",
        }));
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        const response = await fetch(
          getConversationUrl(encodedProjectName, sessionId),
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load conversation: ${response.status} ${response.statusText}`,
          );
        }

        const conversationHistory: ConversationHistory = await response.json();

        // Validate the response structure
        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          throw new Error("Invalid conversation history format");
        }

        // Convert unknown[] to TimestampedSDKMessage[] with type checking and timestamp fallbacks
        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          } else if (typeof msg === "object" && msg !== null && "type" in msg) {
            // Handle messages without timestamps by adding fallback timestamp
            console.log("Adding fallback timestamp to message:", msg.type, (msg as any).subtype || 'no subtype');
            const messageWithTimestamp = {
              ...msg,
              timestamp: new Date().toISOString(), // Fallback timestamp
            } as TimestampedSDKMessage;
            timestampedMessages.push(messageWithTimestamp);
          } else {
            console.warn("Skipping invalid message in history:", msg);
          }
        }

        // Limit large conversations to prevent browser crashes
        const MAX_INITIAL_MESSAGES = 100;
        let messagesToProcess = timestampedMessages;

        if (timestampedMessages.length > MAX_INITIAL_MESSAGES) {
          console.log(`Large conversation detected (${timestampedMessages.length} messages). Loading most recent ${MAX_INITIAL_MESSAGES} messages to prevent browser crashes.`);
          // Take the most recent messages (end of array)
          messagesToProcess = timestampedMessages.slice(-MAX_INITIAL_MESSAGES);
        }

        // Convert to frontend message format
        console.log(`🔍 Converting ${messagesToProcess.length} messages to frontend format...`);
        console.log("Messages by type before conversion:", messagesToProcess.reduce((acc, msg) => {
          const key = msg.type + (msg.subtype ? `:${msg.subtype}` : '');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}));
        const convertedMessages = convertConversationHistory(messagesToProcess);
        console.log(`✅ Converted to ${convertedMessages.length} frontend messages`);
        console.log("Converted messages by type:", convertedMessages.reduce((acc, msg) => {
          const key = msg.type;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}));


        setState((prev) => ({
          ...prev,
          messages: convertedMessages,
          loading: false,
          sessionId: conversationHistory.sessionId,
        }));
      } catch (error) {
        console.error("Error loading conversation history:", error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
        }));
      }
    },
    [convertConversationHistory],
  );

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    clearHistory,
  };
}

/**
 * Hook for loading conversation history on mount when sessionId is provided
 * Prevents reloading during active conversation to avoid race conditions
 */
export function useAutoHistoryLoader(
  encodedProjectName?: string,
  sessionId?: string,
): HistoryLoaderResult {
  const historyLoader = useHistoryLoader();
  const [lastLoadedSessionId, setLastLoadedSessionId] = useState<string | undefined>();

  useEffect(() => {
    if (encodedProjectName && sessionId) {
      // Only load if this is a different session than what we last loaded
      // This prevents reloading when session ID changes during an active conversation
      if (sessionId !== lastLoadedSessionId) {
        console.log(`Loading history for session: ${sessionId} (previous: ${lastLoadedSessionId})`);
        historyLoader.loadHistory(encodedProjectName, sessionId);
        setLastLoadedSessionId(sessionId);
      }
    } else if (!sessionId) {
      // Only clear if there's no sessionId - don't clear while waiting for encodedProjectName
      historyLoader.clearHistory();
      setLastLoadedSessionId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedProjectName, sessionId]);

  return historyLoader;
}
