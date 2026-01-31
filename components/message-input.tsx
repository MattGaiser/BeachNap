"use client";

import { useState, useCallback, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreflightCard } from "./preflight-card";
import { usePreflight } from "@/hooks/use-preflight";
import { useUser } from "@/hooks/use-user";
import { useMessageQueue } from "@/hooks/use-message-queue";
import { MessageQueueIndicator } from "./message-queue-indicator";

interface MessageInputProps {
  channelId: string;
  channelName: string;
  onOpenThread?: (messageId: string) => void;
}

export function MessageInput({ channelId, channelName }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const { user } = useUser();
  const { result, isLoading: isPreflightLoading, setQuery, clearResult } = usePreflight();

  // Message queue for non-blocking sends
  const { queue, enqueue, retry, remove, pendingCount } = useMessageQueue({
    onSend: async (content: string) => {
      if (!user) return false;
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            channelId,
            userId: user.id,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  });

  const handleSend = useCallback(() => {
    if (!message.trim() || !user) return;

    // Add to queue (non-blocking)
    enqueue(message);
    setMessage("");
    setQuery("");
    clearResult();
  }, [message, user, enqueue, setQuery, clearResult]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setMessage(value);
    setQuery(value);
  }

  const isSendDisabled = !message.trim();

  // Store handleSend in a ref for the event handler
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;
  const isSendDisabledRef = useRef(isSendDisabled);
  isSendDisabledRef.current = isSendDisabled;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isSendDisabledRef.current) {
        handleSendRef.current();
      }
    }
  }, []);

  return (
    <div className="border-t p-4 space-y-3">
      {/* Message Queue Indicator */}
      {pendingCount > 0 && (
        <MessageQueueIndicator
          queue={queue}
          onRetry={retry}
          onRemove={remove}
        />
      )}

      {/* Preflight Card - shown but doesn't block */}
      {(result || isPreflightLoading) && (
        <PreflightCard
          result={result}
          isLoading={isPreflightLoading}
          onDismiss={clearResult}
        />
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={isSendDisabled}
          size="icon"
          title="Send message"
        >
          {pendingCount > 0 ? (
            <div className="relative">
              <Send className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full h-3 w-3 flex items-center justify-center">
                {pendingCount}
              </span>
            </div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
