"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash } from "lucide-react";
import { Channel, MessageWithUser } from "@/types/database";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ThreadPanel } from "./thread-panel";
import { useMessages } from "@/hooks/use-messages";
import { useUser } from "@/hooks/use-user";

interface ChannelViewProps {
  channel: Channel;
}

export function ChannelView({ channel }: ChannelViewProps) {
  const router = useRouter();
  const { user } = useUser();
  const { messages, isLoading } = useMessages(channel.id);
  const [activeThread, setActiveThread] = useState<MessageWithUser | null>(null);

  function handleOpenThread(messageId: string) {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setActiveThread(message);
    }
  }

  function handleCloseThread() {
    setActiveThread(null);
  }

  async function handleStartDM(otherUserId: string) {
    if (!user) return;

    try {
      const response = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId: user.id,
          otherUserId,
        }),
      });

      const data = await response.json();
      if (data.conversationId) {
        router.push(`/dm/${data.conversationId}`);
      }
    } catch (error) {
      console.error("Failed to start DM:", error);
    }
  }

  return (
    <div className="flex-1 flex h-full">
      {/* Main Channel View */}
      <div className="flex-1 flex flex-col h-full">
        {/* Channel Header */}
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">{channel.name}</h2>
          {channel.description && (
            <span className="text-sm text-muted-foreground ml-2">
              — {channel.description}
            </span>
          )}
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onOpenThread={handleOpenThread}
          onStartDM={handleStartDM}
          currentUserId={user?.id}
        />

        {/* Input */}
        <MessageInput channelId={channel.id} channelName={channel.name} />
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <ThreadPanel
          parentMessage={activeThread}
          channelId={channel.id}
          onClose={handleCloseThread}
          onStartDM={handleStartDM}
        />
      )}
    </div>
  );
}
