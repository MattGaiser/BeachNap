"use client";

import { MessageSquare } from "lucide-react";
import { DmMessageList } from "./dm-message-list";
import { DmMessageInput } from "./dm-message-input";
import { useDmMessages } from "@/hooks/use-dm-messages";

interface DmViewProps {
  conversationId: string;
  otherUser: { id: string; username: string } | null;
  currentUserId: string;
}

export function DmView({ conversationId, otherUser, currentUserId }: DmViewProps) {
  const { messages, isLoading } = useDmMessages(conversationId);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-lg">
          {otherUser?.username || "Unknown User"}
        </h2>
      </div>

      {/* Messages */}
      <DmMessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <DmMessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        otherUsername={otherUser?.username || "user"}
      />
    </div>
  );
}
