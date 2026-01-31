"use client";

import { useState, useCallback } from "react";
import { ActionItem, ActionItemsResult } from "@/types/action-items";

export function useActionItems(channelId: string, userId?: string) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("");

  const fetchActionItems = useCallback(
    async (hoursBack: number = 24) => {
      if (!channelId) return;

      setIsLoading(true);

      try {
        const res = await fetch("/api/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId, userId, hoursBack }),
        });

        const data: ActionItemsResult = await res.json();

        setItems(data.items || []);
        setTimeRange(data.timeRange || "");
      } catch (error) {
        console.error("Failed to fetch action items:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [channelId, userId]
  );

  const dismissItem = useCallback(
    async (messageId: string) => {
      if (!userId) return;

      try {
        const res = await fetch("/api/action-items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, userId }),
        });

        if (res.ok) {
          // Remove the item from local state
          setItems((prev) => prev.filter((item) => item.messageId !== messageId));
        }
      } catch (error) {
        console.error("Failed to dismiss action item:", error);
      }
    },
    [userId]
  );

  const refresh = useCallback(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  return { items, isLoading, timeRange, fetchActionItems, refresh, dismissItem };
}
