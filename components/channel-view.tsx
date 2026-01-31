"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Channel, MessageWithUser } from "@/types/database";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ThreadPanel } from "./thread-panel";
import { ChannelHeader } from "./channel-header";
import { CatchMeUpCard } from "./catch-me-up-card";
import { useMessages } from "@/hooks/use-messages";
import { useUser } from "@/hooks/use-user";

interface CatchMeUpResult {
  summary: string | null;
  messageCount: number;
  timeRange: string;
  noActivity: boolean;
}

interface ChannelViewProps {
  channel: Channel;
}

export function ChannelView({ channel }: ChannelViewProps) {
  const router = useRouter();
  const { user } = useUser();
  const { messages, isLoading } = useMessages(channel.id);
  const [activeThread, setActiveThread] = useState<MessageWithUser | null>(null);
  const [catchMeUpResult, setCatchMeUpResult] = useState<CatchMeUpResult | null>(null);
  const [isCatchMeUpLoading, setIsCatchMeUpLoading] = useState(false);

  const handleCatchMeUp = useCallback(async () => {
    setIsCatchMeUpLoading(true);
    setCatchMeUpResult(null);

    try {
      const response = await fetch("/api/catch-me-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, hoursBack: 24 }),
      });

      const data = await response.json();
      setCatchMeUpResult(data);
    } catch (error) {
      console.error("Failed to get catch-me-up summary:", error);
    } finally {
      setIsCatchMeUpLoading(false);
    }
  }, [channel.id]);

  const handleDismissCatchMeUp = useCallback(() => {
    setCatchMeUpResult(null);
  }, []);

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
        {/* Channel Header with Catch Me Up */}
        <ChannelHeader
          channelName={channel.name}
          channelId={channel.id}
          onCatchMeUp={handleCatchMeUp}
          isLoading={isCatchMeUpLoading}
        />

        {/* Catch Me Up Result */}
        {catchMeUpResult && (
          <CatchMeUpCard
            result={catchMeUpResult}
            onDismiss={handleDismissCatchMeUp}
          />
        )}

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
