import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { content, userId } = await request.json();

    if (!content || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify user is part of this conversation
    const { data: participant } = await supabase
      .from("dm_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Generate embedding for the message
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
    }

    // Insert the message
    const { data, error } = await supabase
      .from("dm_messages")
      .insert({
        content,
        conversation_id: conversationId,
        user_id: userId,
        embedding,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      console.error("Failed to insert DM:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("DM Message API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
