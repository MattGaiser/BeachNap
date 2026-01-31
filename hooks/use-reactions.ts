"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReactionWithUsers } from "@/types/database";

type ReactionsMap = Record<string, ReactionWithUsers[]>;

export function useReactions(messageIds: string[]) {
  const [reactions, setReactions] = useState<ReactionsMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch reactions for the given message IDs
  const fetchReactions = useCallback(async () => {
    if (messageIds.length === 0) {
      setReactions({});
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/reactions?messageIds=${messageIds.join(",")}`
      );
      const data = await res.json();

      if (data.reactions) {
        setReactions(data.reactions);
      }
    } catch (error) {
      console.error("Failed to fetch reactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [messageIds]);

  // Toggle a reaction (add/remove)
  const toggleReaction = useCallback(
    async (messageId: string, userId: string, emoji: string) => {
      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, userId, emoji }),
        });

        const data = await res.json();

        // Optimistically update local state
        setReactions((prev) => {
          const messageReactions = prev[messageId] || [];

          if (data.action === "removed") {
            // Remove user from this emoji's reaction
            const updated = messageReactions
              .map((r) => {
                if (r.emoji === emoji) {
                  const newUserIds = r.userIds.filter((id) => id !== userId);
                  return {
                    ...r,
                    count: newUserIds.length,
                    userIds: newUserIds,
                  };
                }
                return r;
              })
              .filter((r) => r.count > 0);

            return { ...prev, [messageId]: updated };
          } else {
            // Add user to this emoji's reaction
            const existingReaction = messageReactions.find(
              (r) => r.emoji === emoji
            );

            if (existingReaction) {
              const updated = messageReactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count + 1,
                      userIds: [...r.userIds, userId],
                    }
                  : r
              );
              return { ...prev, [messageId]: updated };
            } else {
              return {
                ...prev,
                [messageId]: [
                  ...messageReactions,
                  { emoji, count: 1, userIds: [userId] },
                ],
              };
            }
          }
        });

        return data;
      } catch (error) {
        console.error("Failed to toggle reaction:", error);
        throw error;
      }
    },
    []
  );

  // Fetch on mount and when messageIds change
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (messageIds.length === 0) return;

    const supabase = createClient();

    const channel = supabase
      .channel("reactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          // Refetch when any reaction changes
          // This is simpler than trying to parse individual changes
          const changedMessageId =
            (payload.new as { message_id?: string })?.message_id ||
            (payload.old as { message_id?: string })?.message_id;

          if (changedMessageId && messageIds.includes(changedMessageId)) {
            fetchReactions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds, fetchReactions]);

  return { reactions, isLoading, toggleReaction, refetch: fetchReactions };
}
