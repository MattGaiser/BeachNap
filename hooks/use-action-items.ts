"use client";

import { useState, useCallback } from "react";
import { ActionItem, ActionItemsResult } from "@/types/action-items";

export function useActionItems(channelId: string) {
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
          body: JSON.stringify({ channelId, hoursBack }),
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
    [channelId]
  );

  const refresh = useCallback(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  return { items, isLoading, timeRange, fetchActionItems, refresh };
}
