import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { currentUserId, otherUserId } = await request.json();

    if (!currentUserId || !otherUserId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if conversation already exists
    const { data: existingParticipants } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    if (existingParticipants && existingParticipants.length > 0) {
      const conversationIds = existingParticipants.map((p) => p.conversation_id);

      // Check if other user is in any of these conversations
      const { data: otherParticipant } = await supabase
        .from("dm_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", conversationIds)
        .single();

      if (otherParticipant) {
        return NextResponse.json({
          conversationId: otherParticipant.conversation_id,
          existing: true,
        });
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from("dm_conversations")
      .insert({})
      .select()
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Add both participants
    const { error: partError } = await supabase.from("dm_participants").insert([
      { conversation_id: conversation.id, user_id: currentUserId },
      { conversation_id: conversation.id, user_id: otherUserId },
    ]);

    if (partError) {
      return NextResponse.json(
        { error: "Failed to add participants" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationId: conversation.id,
      existing: false,
    });
  } catch (error) {
    console.error("DM API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
