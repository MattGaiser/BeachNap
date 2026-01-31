"use client";

import { Loader2, RefreshCw, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueuedMessage {
  id: string;
  content: string;
  status: "pending" | "sending" | "sent" | "error";
  error?: string;
}

interface MessageQueueIndicatorProps {
  queue: QueuedMessage[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MessageQueueIndicator({
  queue,
  onRetry,
  onRemove,
}: MessageQueueIndicatorProps) {
  const activeMessages = queue.filter(
    (m) => m.status === "pending" || m.status === "sending" || m.status === "error"
  );

  if (activeMessages.length === 0) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-2 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Sending messages...</span>
      </div>

      {activeMessages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${
            msg.status === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-background"
          }`}
        >
          {msg.status === "sending" && (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          )}
          {msg.status === "pending" && (
            <div className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0" />
          )}
          {msg.status === "sent" && (
            <Check className="h-3 w-3 text-green-500 shrink-0" />
          )}
          {msg.status === "error" && (
            <AlertCircle className="h-3 w-3 shrink-0" />
          )}

          <span className="truncate flex-1 text-xs">
            {msg.content.length > 50
              ? msg.content.slice(0, 50) + "..."
              : msg.content}
          </span>

          {msg.status === "error" && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onRetry(msg.id)}
                title="Retry"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onRemove(msg.id)}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
