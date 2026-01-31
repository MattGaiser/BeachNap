"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

interface DmConversationWithUser {
  id: string;
  created_at: string;
  otherUser: {
    id: string;
    username: string;
  } | null;
}

export function useDmConversations() {
  const [conversations, setConversations] = useState<DmConversationWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    // Get all conversations the user is part of
    const { data: participantData, error: participantError } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (participantError || !participantData) {
      setIsLoading(false);
      return;
    }

    const conversationIds = participantData.map((p) => p.conversation_id);

    if (conversationIds.length === 0) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    // Get the other participants
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from("dm_participants")
      .select("conversation_id, user_id, profiles(id, username)")
      .in("conversation_id", conversationIds)
      .neq("user_id", user.id);

    if (allParticipantsError) {
      setIsLoading(false);
      return;
    }

    // Get conversation details
    const { data: convData, error: convError } = await supabase
      .from("dm_conversations")
      .select("*")
      .in("id", conversationIds)
      .order("created_at", { ascending: false });

    if (convError || !convData) {
      setIsLoading(false);
      return;
    }

    const conversationsWithUsers: DmConversationWithUser[] = convData.map((conv) => {
      const participant = allParticipants?.find(
        (p) => p.conversation_id === conv.id
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profiles = participant?.profiles as any;
      return {
        id: conv.id,
        created_at: conv.created_at,
        otherUser: profiles ? { id: profiles.id, username: profiles.username } : null,
      };
    });

    setConversations(conversationsWithUsers);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to new DM participants for this user
    const supabase = createClient();
    const channel = supabase
      .channel(`dm_participants:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Re-fetch conversations when user is added to a new DM
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return { conversations, isLoading };
}
