"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface QueuedMessage {
  id: string;
  content: string;
  status: "pending" | "sending" | "sent" | "error";
  error?: string;
  createdAt: Date;
}

interface UseMessageQueueOptions {
  onSend: (content: string) => Promise<boolean>;
  maxRetries?: number;
}

export function useMessageQueue({ onSend, maxRetries = 2 }: UseMessageQueueOptions) {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  // Add message to queue
  const enqueue = useCallback((content: string) => {
    const message: QueuedMessage = {
      id: crypto.randomUUID(),
      content,
      status: "pending",
      createdAt: new Date(),
    };
    setQueue((prev) => [...prev, message]);
    return message.id;
  }, []);

  // Process the queue
  useEffect(() => {
    async function processNext() {
      // Check if already processing
      if (processingRef.current) return;

      // Find next pending message
      const pendingMessage = queue.find((m) => m.status === "pending");
      if (!pendingMessage) return;

      // Mark as processing
      processingRef.current = true;
      setIsProcessing(true);

      // Update status to sending
      setQueue((prev) =>
        prev.map((m) =>
          m.id === pendingMessage.id ? { ...m, status: "sending" as const } : m
        )
      );

      let retries = 0;
      let success = false;

      while (retries <= maxRetries && !success) {
        try {
          success = await onSendRef.current(pendingMessage.content);
          if (!success) {
            retries++;
          }
        } catch {
          retries++;
        }
      }

      // Update final status
      setQueue((prev) =>
        prev.map((m) =>
          m.id === pendingMessage.id
            ? {
                ...m,
                status: success ? ("sent" as const) : ("error" as const),
                error: success ? undefined : "Failed to send after retries",
              }
            : m
        )
      );

      processingRef.current = false;
      setIsProcessing(false);
    }

    processNext();
  }, [queue, maxRetries]);

  // Cleanup sent messages after 5 seconds
  useEffect(() => {
    const sentMessages = queue.filter((m) => m.status === "sent");
    if (sentMessages.length === 0) return;

    const timeout = setTimeout(() => {
      setQueue((prev) => prev.filter((m) => m.status !== "sent"));
    }, 5000);

    return () => clearTimeout(timeout);
  }, [queue]);

  // Retry a failed message
  const retry = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: "pending" as const, error: undefined } : m
      )
    );
  }, []);

  // Remove a message from queue
  const remove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Get pending count
  const pendingCount = queue.filter(
    (m) => m.status === "pending" || m.status === "sending"
  ).length;

  return {
    queue,
    enqueue,
    retry,
    remove,
    isProcessing,
    pendingCount,
  };
}
