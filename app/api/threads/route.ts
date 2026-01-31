import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { content, channelId, userId, parentId } = await request.json();

    if (!content || !channelId || !userId || !parentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate embedding for the message
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
    }

    // Insert the reply
    const { data, error } = await supabase
      .from("messages")
      .insert({
        content,
        channel_id: channelId,
        user_id: userId,
        parent_id: parentId,
        embedding,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      console.error("Failed to insert thread reply:", error);
      return NextResponse.json(
        { error: "Failed to send reply" },
        { status: 500 }
      );
    }

    // Update reply count on parent message
    await supabase.rpc("increment_reply_count", { message_id: parentId });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Thread API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
