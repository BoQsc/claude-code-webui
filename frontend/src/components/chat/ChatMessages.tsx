import { useRef, useEffect } from "react";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  CombinedToolMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  LoadingComponent,
} from "../MessageComponents";
// import { UI_CONSTANTS } from "../../utils/constants"; // Unused for now

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
}

// Type for grouped messages
type MessageGroup =
  | { type: "single"; message: AllMessage; index: number }
  | { type: "combined_tool"; toolMessage: ToolMessage; resultMessage?: ToolResultMessage; index: number };

// Helper function to extract tool name from tool message content
function extractToolNameFromMessage(content: string): string {
  // Look for pattern like "Read(...)" or "Edit(...)"
  const match = content.match(/^([A-Za-z]+)\(/);
  return match ? match[1] : "";
}

// Helper function to group consecutive tool messages
function groupMessages(messages: AllMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let i = 0;

  while (i < messages.length) {
    const currentMessage = messages[i];
    const nextMessage = messages[i + 1];

    // Check if we have a tool message followed by a tool result message
    if (
      isToolMessage(currentMessage) &&
      nextMessage &&
      isToolResultMessage(nextMessage)
    ) {
      const toolNameFromMessage = extractToolNameFromMessage(currentMessage.content);
      const isRelated =
        toolNameFromMessage === nextMessage.toolName ||
        currentMessage.content.startsWith(nextMessage.toolName) ||
        currentMessage.content.includes(`${nextMessage.toolName}(`);

      const timeGapReasonable = Math.abs(nextMessage.timestamp - currentMessage.timestamp) < 10000; // Within 10 seconds

      if (isRelated && timeGapReasonable) {
        // Create combined group
        groups.push({
          type: "combined_tool",
          toolMessage: currentMessage,
          resultMessage: nextMessage,
          index: i
        });
        i += 2; // Skip both messages
        continue;
      }
    }

    // Check if this is a standalone tool message (should be shown as executing)
    if (isToolMessage(currentMessage)) {
      // Create combined group with no result message (executing state)
      groups.push({
        type: "combined_tool",
        toolMessage: currentMessage,
        resultMessage: undefined, // This will show executing state
        index: i
      });
    } else {
      // Single message (for non-tool messages)
      groups.push({
        type: "single",
        message: currentMessage,
        index: i
      });
    }
    i += 1;
  }

  return groups;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Check if user is near bottom of messages (unused but kept for future use)
  // const isNearBottom = () => {
  //   const container = messagesContainerRef.current;
  //   if (!container) return true;

  //   const { scrollTop, scrollHeight, clientHeight } = container;
  //   return (
  //     scrollHeight - scrollTop - clientHeight <
  //     UI_CONSTANTS.NEAR_BOTTOM_THRESHOLD_PX
  //   );
  // };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessageGroup = (group: MessageGroup) => {
    if (group.type === "combined_tool") {
      // Render combined tool message
      const key = `combined-${group.toolMessage.timestamp}-${group.index}`;
      return (
        <CombinedToolMessageComponent
          key={key}
          toolMessage={group.toolMessage}
          resultMessage={group.resultMessage}
        />
      );
    } else {
      // Render single message
      const message = group.message;
      const key = `${message.timestamp}-${group.index}`;

      if (isSystemMessage(message)) {
        return <SystemMessageComponent key={key} message={message} />;
      } else if (isToolMessage(message)) {
        return <ToolMessageComponent key={key} message={message} />;
      } else if (isToolResultMessage(message)) {
        return <ToolResultMessageComponent key={key} message={message} />;
      } else if (isPlanMessage(message)) {
        return <PlanMessageComponent key={key} message={message} />;
      } else if (isThinkingMessage(message)) {
        return <ThinkingMessageComponent key={key} message={message} />;
      } else if (isTodoMessage(message)) {
        return <TodoMessageComponent key={key} message={message} />;
      } else if (isChatMessage(message)) {
        return <ChatMessageComponent key={key} message={message} />;
      }
    }
    return null;
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto scrollbar-styled bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 p-3 sm:p-6 mb-3 sm:mb-6 rounded-2xl shadow-sm backdrop-blur-sm flex flex-col"
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Spacer div to push messages to the bottom */}
          <div className="flex-1" aria-hidden="true"></div>
          {groupMessages(messages).map(renderMessageGroup)}
          {isLoading && <LoadingComponent />}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
      <div>
        <div className="text-6xl mb-6 opacity-60">
          <span role="img" aria-label="chat icon">
            💬
          </span>
        </div>
        <p className="text-lg font-medium">Start a conversation with Claude</p>
        <p className="text-sm mt-2 opacity-80">
          Type your message below to begin
        </p>
      </div>
    </div>
  );
}
