"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DmMessageWithUser } from "@/types/database";

export function useDmMessages(conversationId: string) {
  const [messages, setMessages] = useState<DmMessageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchMessages() {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*, profiles(*)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as DmMessageWithUser[]);
      }
      setIsLoading(false);
    }

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`dm_messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from("dm_messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            // Prevent duplicates by checking if message already exists
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) {
                return prev;
              }
              return [...prev, data as DmMessageWithUser];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, isLoading };
}
