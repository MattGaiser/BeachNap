"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./message-item";
import { MessageWithUser } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useReactions } from "@/hooks/use-reactions";

interface MessageListProps {
  messages: MessageWithUser[];
  isLoading: boolean;
  onOpenThread?: (messageId: string) => void;
  onStartDM?: (userId: string) => void;
  currentUserId?: string;
}

export function MessageList({ messages, isLoading, onOpenThread, onStartDM, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get message IDs for reactions
  const messageIds = useMemo(
    () => messages.filter((m) => !(m as MessageWithUser & { parent_id?: string }).parent_id).map((m) => m.id),
    [messages]
  );

  const { reactions, toggleReaction } = useReactions(messageIds);

  const handleReactionToggle = useCallback(
    (messageId: string, emoji: string) => {
      if (currentUserId) {
        toggleReaction(messageId, currentUserId, emoji);
      }
    },
    [currentUserId, toggleReaction]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  // Filter out thread replies (messages with parent_id) from main list
  const mainMessages = messages.filter(
    (m) => !(m as MessageWithUser & { parent_id?: string }).parent_id
  );

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="py-4 space-y-4">
        {mainMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onOpenThread={onOpenThread}
            onStartDM={onStartDM}
            currentUserId={currentUserId}
            reactions={reactions[message.id] || []}
            onReactionToggle={handleReactionToggle}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
