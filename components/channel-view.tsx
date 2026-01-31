"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Channel, MessageWithUser } from "@/types/database";
import { ActionItem } from "@/types/action-items";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ThreadPanel } from "./thread-panel";
import { ActionItemsPanel } from "./action-items-panel";
import { ChannelHeader } from "./channel-header";
import { CatchMeUpCard } from "./catch-me-up-card";
import { useMessages } from "@/hooks/use-messages";
import { useUser } from "@/hooks/use-user";

interface CatchMeUpResult {
  summary: string | null;
  messageCount: number;
  timeRange: string;
  noActivity: boolean;
  actionItems?: ActionItem[];
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
  const [showActionItems, setShowActionItems] = useState(false);
  const [lastViewed, setLastViewed] = useState<Date | null>(null);

  // Fetch last viewed time on mount
  useEffect(() => {
    async function fetchLastViewed() {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `/api/channel-view?channelId=${channel.id}&userId=${user.id}`
        );
        const data = await response.json();
        if (data.lastViewed) {
          setLastViewed(new Date(data.lastViewed));
        }
      } catch (error) {
        console.error("Failed to fetch last viewed:", error);
      }
    }

    fetchLastViewed();
  }, [channel.id, user?.id]);

  const handleCatchMeUp = useCallback(async () => {
    setIsCatchMeUpLoading(true);
    setCatchMeUpResult(null);

    try {
      const response = await fetch("/api/catch-me-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          userId: user?.id,
          hoursBack: 24,
        }),
      });

      const data = await response.json();
      setCatchMeUpResult(data);
      // Update last viewed to now since catch-me-up updates the channel view
      setLastViewed(new Date());
    } catch (error) {
      console.error("Failed to get catch-me-up summary:", error);
    } finally {
      setIsCatchMeUpLoading(false);
    }
  }, [channel.id, user?.id]);

  const handleDismissCatchMeUp = useCallback(() => {
    setCatchMeUpResult(null);
  }, []);

  const handleOpenActionItems = useCallback(() => {
    setShowActionItems(true);
  }, []);

  const handleCloseActionItems = useCallback(() => {
    setShowActionItems(false);
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
        {/* Channel Header with Catch Me Up and Action Items */}
        <ChannelHeader
          channelName={channel.name}
          channelId={channel.id}
          onCatchMeUp={handleCatchMeUp}
          onOpenActionItems={handleOpenActionItems}
          isLoading={isCatchMeUpLoading}
          lastViewed={lastViewed}
        />

        {/* Catch Me Up Result */}
        {catchMeUpResult && (
          <CatchMeUpCard
            result={catchMeUpResult}
            onDismiss={handleDismissCatchMeUp}
            userId={user?.id}
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

      {/* Action Items Panel */}
      {showActionItems && (
        <ActionItemsPanel
          channelId={channel.id}
          channelName={channel.name}
          userId={user?.id}
          onClose={handleCloseActionItems}
        />
      )}
    </div>
  );
}
