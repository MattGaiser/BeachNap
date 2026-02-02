"use client";

import { useState, useCallback, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreflightCard } from "./preflight-card";
import { ToneCheckCard } from "./tone-check-card";
import { usePreflight } from "@/hooks/use-preflight";
import { useToneCheck } from "@/hooks/use-tone-check";
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
  const {
    result: toneResult,
    isLoading: isToneLoading,
    checkMessage,
    dismiss: dismissTone,
    reset: resetTone,
  } = useToneCheck();

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
    resetTone();
  }, [message, user, enqueue, setQuery, clearResult, resetTone]);

  // Force send despite tone warning - dismisses warning and sends immediately
  const handleSendAnyway = useCallback(() => {
    if (!message.trim() || !user) return;

    // Dismiss the warning first, then send
    dismissTone();
    enqueue(message);
    setMessage("");
    setQuery("");
    clearResult();
    resetTone();
  }, [message, user, dismissTone, enqueue, setQuery, clearResult, resetTone]);

  // Send despite knowledge check showing an answer - user wants to ask anyway
  const handleAskAnyway = useCallback(() => {
    if (!message.trim() || !user) return;

    // Clear the preflight result and send
    clearResult();
    enqueue(message);
    setMessage("");
    setQuery("");
    resetTone();
  }, [message, user, clearResult, enqueue, setQuery, resetTone]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setMessage(value);
    setQuery(value);
    checkMessage(value);
  }

  // Block sending if:
  // 1. Message is empty
  // 2. Tone check is in progress (waiting for result)
  // 3. Tone check detected incomplete message (user must dismiss warning first)
  const hasToneWarning = toneResult?.isIncomplete === true;
  const isSendDisabled = !message.trim() || isToneLoading || hasToneWarning;

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

      {/* Tone Check Card - blocks sending until dismissed */}
      {(toneResult || isToneLoading) && !result && !isPreflightLoading && (
        <ToneCheckCard
          result={toneResult}
          isLoading={isToneLoading}
          onDismiss={dismissTone}
          onSendAnyway={handleSendAnyway}
        />
      )}

      {/* Preflight Card - shown but doesn't block */}
      {(result || isPreflightLoading) && (
        <PreflightCard
          result={result}
          isLoading={isPreflightLoading}
          onDismiss={clearResult}
          onSendAnyway={handleAskAnyway}
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
