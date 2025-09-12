import { useState, useCallback, useEffect, useMemo } from "react";
import type { AllMessage, ChatMessage } from "../../types";
import { generateId } from "../../utils/id";

// Constants for message management
const MAX_MESSAGES = 500; // Maximum messages to keep in memory
const CLEANUP_THRESHOLD = 600; // Start cleanup when this many messages
const MESSAGES_TO_KEEP = 400; // Keep this many messages after cleanup

interface ChatStateOptions {
  initialMessages?: AllMessage[];
  initialSessionId?: string;
}

const DEFAULT_MESSAGES: AllMessage[] = [];

export function useChatState(options: ChatStateOptions = {}) {
  const { initialMessages = DEFAULT_MESSAGES, initialSessionId = null } =
    options;

  // Memoize initial messages to prevent infinite loops
  const memoizedInitialMessages = useMemo(
    () => initialMessages,
    [initialMessages],
  );

  const [messages, setMessages] = useState<AllMessage[]>(
    memoizedInitialMessages,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    initialSessionId,
  );
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [hasShownInitMessage, setHasShownInitMessage] = useState(false);
  const [hasReceivedInit, setHasReceivedInit] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<ChatMessage | null>(null);

  // Update messages and sessionId when initial values change
  useEffect(() => {
    setMessages(memoizedInitialMessages);
  }, [memoizedInitialMessages]);

  useEffect(() => {
    setCurrentSessionId(initialSessionId);
  }, [initialSessionId]);

  // Message cleanup function to prevent memory growth
  const cleanupMessages = useCallback((messages: AllMessage[]) => {
    if (messages.length <= CLEANUP_THRESHOLD) {
      return messages;
    }

    // Keep the most recent messages, prioritizing important message types
    const recentMessages = messages.slice(-MESSAGES_TO_KEEP);
    console.log(`[ChatState] Cleaned up messages: ${messages.length} -> ${recentMessages.length}`);
    return recentMessages;
  }, []);

  const addMessage = useCallback((msg: AllMessage) => {
    setMessages((prev) => {
      const newMessages = [...prev, msg];
      // Cleanup if we exceed the threshold
      return cleanupMessages(newMessages);
    });
  }, [cleanupMessages]);

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 && msg.type === "chat"
          ? { ...msg, content }
          : msg,
      ),
    );
  }, []);

  const clearInput = useCallback(() => {
    setInput("");
  }, []);

  const generateRequestId = useCallback(() => {
    const requestId = generateId();
    setCurrentRequestId(requestId);
    return requestId;
  }, []);

  const resetRequestState = useCallback(() => {
    setIsLoading(false);
    setCurrentRequestId(null);
    setCurrentAssistantMessage(null);
  }, []);

  const startRequest = useCallback(() => {
    setIsLoading(true);
    setCurrentAssistantMessage(null);
    setHasReceivedInit(false);
  }, []);

  return {
    // State
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    hasShownInitMessage,
    hasReceivedInit,
    currentAssistantMessage,

    // State setters
    setMessages,
    setInput,
    setIsLoading,
    setCurrentSessionId,
    setCurrentRequestId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,

    // Helper functions
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
  };
}
