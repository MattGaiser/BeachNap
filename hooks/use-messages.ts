"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageWithUser } from "@/types/database";

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as MessageWithUser[]);
      }
      setIsLoading(false);
    }

    fetchMessages();

    // Subscribe to message changes
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            // Prevent duplicates by checking if message already exists
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) {
                return prev;
              }
              return [...prev, data as MessageWithUser];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Update reply_count when threads are updated
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.id ? (data as MessageWithUser) : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return { messages, isLoading };
}
